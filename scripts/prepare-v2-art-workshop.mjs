import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const roles = new Set(['hero', 'companion', 'enemy', 'boss']);
const args = process.argv.slice(2);

if (args.includes('--help') || args.length < 2) {
  console.log('Usage: npm run art:workshop:prepare -- <actor-id> <hero|companion|enemy|boss> [--dry-run]');
  process.exit(args.includes('--help') ? 0 : 2);
}

const [id, role] = args;
const dryRun = args.includes('--dry-run');

if (!/^[a-z][a-z0-9-]{1,48}$/.test(id) || !roles.has(role) || args.some(a => a !== id && a !== role && a !== '--dry-run')) {
  console.error('Invalid actor id/role. Use lowercase Latin slug and an allowed role.');
  process.exit(2);
}

const output = join(projectRoot, '.workshop', 'v2-actors', id);
const filename = join(output, 'BRIEF.md');
const facing = role === 'hero' || role === 'companion' ? 'вправо' : 'влево';
const brief = `# TERRITORY 2.0 — 2D-риг ${id}

Роль: ${role}. Боевой взгляд: ${facing}. Эталон: \`docs/TERRITORY_2_0_CANON/SOURCE_OF_TRUTH_RU.md\`, главный образец: \`docs/reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg\`.

## Стиль и материалы

- Яркий, насыщенный мультяшный викинг из утверждённой игры; чистый силуэт, чёткие контуры, никакого мрачного реализма.
- Прозрачный фон у каждого игрового слоя. Не перерисовывать оригинальные сторонние игровые референсы как наши ассеты.
- Сначала цельный персонаж в A-позе (обе кисти и обе ступни целы), потом лист **тех же** частей: голова, торс/таз, левая и правая руки от плеча через локоть до кисти, обе ноги от бедра через колено до стопы.
- Отдельные подвижные элементы: волосы/плащ, оружие, щит (если есть). Кисть держит оружие за рукоять. Амуниция крепится к конкретным костям; экипировка не должна требовать отдельный код для каждого образа.

## Минимум для живого боя

| Действие | Что меняется на самом деле |
|---|---|
| Idle | дыхание, грудная клетка, руки, взгляд; ступни на месте |
| Run/walk | противоположное движение ног и рук, сгиб коленей и локтей, фаза шага привязана к расстоянию |
| Attack 1 / Attack 2 | замах, контакт лезвия с целью, последующее движение и возвращение в стойку |
| Block / dodge | независимые плечи, локти, ноги и корпус; предмет защиты прикреплён к кисти |
| Hit / stun | реакция корпуса и головы, движение инерционных деталей, сохранение соединения суставов |
| Defeat / victory | читаемая отдельная последовательность, а не только масштабирование всего спрайта |

## Жёсткие критерии принятия

1. Плечо–локоть–кисть, бедро–колено–стопа — соединения сохраняются на **всех** кадрах и в переходах. Ни один элемент не висит отдельно.
2. При опорной фазе стопа не скользит по земле; ноги не проваливаются; колени действительно сгибаются.
3. Оружие всё время в кисти; острие достигает цели **именно в кадре удара**. Плащ/волосы движутся вслед за телом, без мгновенного телепорта.
4. Нельзя выдавать за анимацию перемещение или покачивание единой неподвижной картинки.
5. Проверить покадровую раскладку и измерения в \`.agents/skills/ref2game/scripts/qa.mjs\` на самостоятельном WebGL-прототипе. Тесты React-приложения отдельно.
6. Финальный ассет интегрируется только после сверки с утверждённой стилистикой и корректным управлением универсальной экипировкой.

## Безопасная изоляция

- Прототип держать под \`.workshop/v2-actors/${id}/prototype/\`; **никогда** не запускать setup с корнем TERRITORY 2.0.
- Создание этого брифа не меняет игру, её базу и GitHub Pages.
`;

if (dryRun) {
  console.log(JSON.stringify({ id, role, facing, output, willOverwrite: existsSync(filename) }, null, 2));
  process.exit(0);
}

mkdirSync(output, { recursive: true });
try {
  writeFileSync(filename, brief, { encoding: 'utf8', flag: 'wx' });
  console.log(`Создан бриф: ${filename}`);
} catch (error) {
  if (error?.code === 'EEXIST') {
    console.log(`Бриф уже существует, оставлен без изменений: ${filename}`);
  } else {
    throw error;
  }
}
