#!/usr/bin/env python3
"""Read-only sharing audit for a UIKit ZIP or distribution folder.

Finds literal paths/identity markers, a few recognizable credential formats, and
packaging junk. It never extracts or executes files or follows known symlinks.
This is a bounded heuristic audit, not a security guarantee: encoded secrets,
nested archives, compressed PNG text, and steganography are not decoded. PNG
chunks are inventoried, not authenticated; C2PA provenance should be preserved.
Only the first match per category/file is reported. Public font licenses,
author emails, UUIDs, and localhost URLs are allowed.
"""
import argparse
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import struct
import sys
import zipfile
import zlib

LIMIT = 64 * 1024 * 1024
TOTAL_LIMIT = 512 * 1024 * 1024
PATTERNS = {
    'personal-path': re.compile(r'/[U]sers/[^/\r\n"\'<>]+/|/[h]ome/[^/\r\n"\'<>]+/|[A-Za-z]:[\\/]+(?:Users|Documents and Settings)[\\/]+[^\\/\r\n"<>]+[\\/]', re.I),
    'internal-generation-path': re.compile(r'\.codex[\\/]+generated_images(?:[\\/]|\b)', re.I),
    'private-key': re.compile(r'-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----'),
    'credential-token': re.compile(r'\b(?:AKIA[A-Z0-9]{16}|ASIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,}|sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}|sk_live_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AIza[A-Za-z0-9_-]{35})\b'),
}
JUNK = {'.ds_store', '__macosx', '.git', '.svn', '__pycache__'}
PRIVATE = {'.npmrc', '.pypirc', '.netrc', '.ssh', '.aws', 'id_rsa', 'id_ed25519', 'id_ecdsa'}
ENV_EXAMPLES = {'.env.example', '.env.sample', '.env.template'}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('path', type=Path, help='Actual ZIP or distribution folder to inspect')
    parser.add_argument('--identity', action='append', default=[], help='Literal private identity marker; repeatable (case insensitive)')
    parser.add_argument('--json', type=Path, metavar='OUTPUT', help='Write JSON report outside the scanned folder')
    args = parser.parse_args()
    root = args.path.absolute()
    if any(not marker.strip() for marker in args.identity):
        parser.error('--identity must not be empty')
    if args.json:
        output = args.json.absolute()
        if output.resolve() == root.resolve() or (root.is_dir() and root.resolve() in output.resolve().parents):
            parser.error('--json output must be outside the scanned folder and cannot overwrite the input')
    patterns = dict(PATTERNS)
    if args.identity:
        patterns['identity-marker'] = re.compile('|'.join(re.escape(x) for x in args.identity), re.I)
    findings, seen = [], set()
    state = {'files': 0, 'bytes': 0}

    def redact(value):
        for pattern in patterns.values():
            value = pattern.sub('[redacted]', value)
        return value

    def add(level, category, name, line=None, detail=None):
        item = {'level': level, 'category': category, 'file': redact(name)}
        if line is not None:
            item['line'] = line
        if detail:
            item['detail'] = detail
        key = json.dumps(item, sort_keys=True)
        if key not in seen:
            seen.add(key)
            findings.append(item)

    def scan(data, name):
        if isinstance(data, bytes):
            data = data.decode('utf-16' if data.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8', errors='replace')
        for category, pattern in patterns.items():
            match = pattern.search(data)
            if match:
                add('error', category, name, data.count('\n', 0, match.start()) + 1, 'Match redacted')

    def inspect_name(name):
        scan(name, name)
        for part in name.replace('\\', '/').split('/'):
            part = part.lower()
            if part in JUNK or part.endswith('.pyc'):
                add('error', 'packaging-junk', name)
            if part in PRIVATE or (part.startswith('.env') and (part == '.env' or part.startswith('.env.')) and part not in ENV_EXAMPLES):
                add('error', 'private-config', name)

    def png(data, name):
        if not data.startswith(b'\x89PNG\r\n\x1a\n'):
            add('error', 'invalid-png', name)
            return
        position, ended = 8, False
        while position + 12 <= len(data):
            length, kind = struct.unpack('>I4s', data[position:position + 8])
            if position + 12 + length > len(data):
                break
            if kind in (b'iTXt', b'tEXt', b'zTXt', b'eXIf'):
                add('review', 'png-metadata', name, detail=kind.decode() + ': contents not parsed; review before sharing')
            if kind == b'caBX':
                add('info', 'png-c2pa-provenance', name, detail='caBX present: preserve provenance; contents and authenticity not verified')
            position += 12 + length
            if kind == b'IEND':
                ended = True
                break
        if not ended or position != len(data):
            add('error', 'malformed-png', name, detail='Incomplete chunks or trailing data')

    def read_content(stream, name):
        remaining = min(LIMIT, max(0, TOTAL_LIMIT - state['bytes']))
        data = stream.read(remaining + 1)
        state['files'] += 1
        state['bytes'] += len(data)
        if len(data) > remaining:
            add('error', 'scan-limit', name, detail='Incomplete audit: 64 MiB per file / 512 MiB total limit')
            return
        scan(data, name)
        if name.lower().endswith('.png'):
            png(data, name)

    def read_file(path, name, callback):
        try:
            if not stat.S_ISREG(path.lstat().st_mode):
                add('error', 'unsupported-file', name, detail='Not read')
                return
            fd = os.open(path, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
            with os.fdopen(fd, 'rb') as stream:
                if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                    add('error', 'unsupported-file', name)
                    return
                callback(stream)
        except (OSError, ValueError, zipfile.BadZipFile, RuntimeError, EOFError, NotImplementedError, zlib.error) as exc:
            add('error', 'read-failure', name, detail=type(exc).__name__)

    def inspect_zip(stream):
        with zipfile.ZipFile(stream) as archive:
            if archive.comment:
                add('review', 'zip-comment', '<archive>', detail='Archive comment present')
                scan(archive.comment, '<archive comment>')
            for entry in archive.infolist():
                name = entry.filename
                inspect_name(name)
                parts = PurePosixPath(name.replace('\\', '/')).parts
                if '..' in parts or name.startswith(('/', '\\')) or re.match(r'^[A-Za-z]:', name):
                    add('error', 'unsafe-archive-path', name)
                if stat.S_ISLNK(entry.external_attr >> 16):
                    add('error', 'symlink', name, detail='Not followed')
                    continue
                for label, value in [('comment', entry.comment), ('extra', entry.extra)]:
                    if value:
                        add('review', 'zip-entry-' + label, name, detail='Metadata present; review before sharing')
                        scan(value, name + ' <' + label + '>')
                if entry.is_dir():
                    continue
                try:
                    with archive.open(entry) as member:
                        read_content(member, name)
                except (OSError, ValueError, zipfile.BadZipFile, RuntimeError, EOFError, NotImplementedError, zlib.error) as exc:
                    add('error', 'read-failure', name, detail=type(exc).__name__)

    scan(root.name, '<bundle name>')
    try:
        if root.is_symlink():
            add('error', 'symlink', '<input>', detail='Not followed')
        elif root.is_dir():
            def walk_error(exc):
                add('error', 'read-failure', '<directory>', detail=type(exc).__name__)
            for base, dirs, files in os.walk(root, followlinks=False, onerror=walk_error):
                for leaf in sorted(dirs + files):
                    path = Path(base) / leaf
                    name = path.relative_to(root).as_posix()
                    inspect_name(name)
                    if path.is_symlink():
                        add('error', 'symlink', name, detail='Not followed')
                        if leaf in dirs:
                            dirs.remove(leaf)
                    elif leaf in files:
                        read_file(path, name, lambda stream, n=name: read_content(stream, n))
        else:
            read_file(root, '<archive>', inspect_zip)
    except OSError as exc:
        add('error', 'read-failure', '<input>', detail=type(exc).__name__)
    report = {'passed': not any(f['level'] == 'error' for f in findings), 'scanned': state, 'findings': findings}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if args.json:
        try:
            args.json.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        except OSError as exc:
            print('Cannot write JSON report: ' + type(exc).__name__, file=sys.stderr)
            return 2
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
