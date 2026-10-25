# Аудит 26 открытых репозиториев «Студия Игор» — 25 октября 2026

**Источник:** [github.com/studioigor](https://github.com/studioigor) — просмотрен весь список из **26 публичных репозиториев**, README, состав и лицензии важных исходников. Проведена выборочная проверка исполняемых скриптов. Название репозитория = ссылка `https://github.com/studioigor/<название>`.

Цель: ускорять **конкретную** Telegram-игру TERRITORY 2.0 на React/Vite + TypeScript, сохранить утверждённые 6 экранов, яркий мультяшный Viking-арт, изоляцию от TERRITORY 1.0, настоящий геймплей и безопасность денег/прогресса. Бесплатный просмотр GitHub **не всегда** означает право переносить файлы в другой репозиторий; наличие лицензии проверяется отдельно.

| Репозиторий | Что реально внутри | Права / решение для V2 |
|---|---|---|
| [ref2game](https://github.com/studioigor/ref2game) | Codex/Claude 2D-навыки, генерация спрайтов, суставные риги, QA неподвижных конечностей, WebGL2-прототипы | **MIT; установлен ранее** в `.agents/skills/ref2game` только как изолированная мастерская |
| [ashen-crown](https://github.com/studioigor/ashen-crown) | Прототип RTS Warcraft-подобной игры на Phaser 3 + Vite; процедурная графика | LICENSE нет; изучать бой как пример, не переносить игру/движок |
| [studioigor-skill](https://github.com/studioigor/studioigor-skill) | Десятиэтапный Claude Code game pipeline, дизайн, арт, движок, тестовые сцены, релиз | MIT; идеи уже отражены в `AGENTS.md`; полный цикл дублирует наше каноническое ТЗ и заменяет workflow |
| [gamestudio](https://github.com/studioigor/gamestudio) | Оркестрация команды через Orca, роль UI/QA, измерения загрузки, проверка чужих изменений логики | **MIT; взят `ui-diff-check.sh`**, настроен под V2 в `.studio/zones.conf` |
| [jev-rts](https://github.com/studioigor/jev-rts) | Unity RTS с JEV API | LICENSE нет; Unity/JEV несовместимы с текущим браузерным V2 |
| [3d-animator-skill](https://github.com/studioigor/3d-animator-skill) | Blender/mocap, ноги без скольжения, захват лица и звука, сравнение видео | **MIT; взят независимый `contact_sheet.py`**. Полный Blender/Mixamo workflow не нужен для уже рисованных 2D-персонажей |
| [dust-horizon-template](https://github.com/studioigor/dust-horizon-template) | 3D Fallout-подобный шаблон Godot, игровые промпты/старт | LICENSE нет; чужой жанр и движок |
| [game-exp-skills](https://github.com/studioigor/game-exp-skills) | `gauntlet-loop` и `gamemaker`: сохранение состояния, слепые A/B, один главнейший дефект за раунд | LICENSE нет; **использован общий метод** без копирования исходников и без дорогих ночных циклов |
| [jev-rts-assets](https://github.com/studioigor/jev-rts-assets) | Крупный Unity URP-пакет 3D-моделей/анимаций, сторонние лицензии | LICENSE нет, пакет около 1.2 ГБ по данным GitHub; не переносить в лёгкую мобильную игру |
| [3d-to-2d](https://github.com/studioigor/3d-to-2d) | Готовый браузерный конвертер GLB/GLTF/FBX-анимаций в PNG sprite sheet/ZIP | README говорит MIT, отдельного LICENSE нет; **дополнительно установлен** в изолированную мастерскую `tools/3d-to-2d/` по просьбе владельца |
| [dust-horizon](https://github.com/studioigor/dust-horizon) | Два объёмных Godot-3D проекта постапокалиптической игры | MIT; не соответствует платформе и жанру V2 |
| [game-plan-for-local-llm](https://github.com/studioigor/game-plan-for-local-llm) | Godot ТЗ с фазами M0–M8 + 0x72 CC0 pixel sprites | Нет LICENSE на план; чужой пиксельный стиль; структура фаз полезна как идея |
| [open-llm-npc](https://github.com/studioigor/open-llm-npc) | Python-сервер NPC-диалогов через совместимые LLM API | LICENSE нет; требует работающий LLM/API, усложняет сервер; пока не нужен |
| [shooter-claude-gpt-gemini](https://github.com/studioigor/shooter-claude-gpt-gemini) | Браузерный 3D/raycast шутер и Electron сборка | LICENSE нет; пример эксперимента, не материал V2 |
| [studioigor-pipeline](https://github.com/studioigor/studioigor-pipeline) | Презентация «Не делай игру. Настрой пайплайн», 46 слайдов | **Все права защищены**, копирование требует письменного разрешения; изучена только общая идея процесса |
| [dungeon-crawler-template](https://github.com/studioigor/dungeon-crawler-template) | Задание + набор 0x72 pixel-art ассетов для сравнения ИИ | Нет LICENSE на репозиторий; описанные 0x72 ассеты CC0, но стиль не соответствует утверждённому V2 |
| [gpt54-gemini31pro-claude46](https://github.com/studioigor/gpt54-gemini31pro-claude46) | 9 игр из теста трёх моделей с одинаковыми заданиями | LICENSE нет; ориентир сравнения, не производственный инструмент |
| [random-game-prompt-generator](https://github.com/studioigor/random-game-prompt-generator) | Одна HTML-страница, случайные жанр/стиль/механики и текст задания | LICENSE и README нет; V2 уже имеет точное ТЗ, случайный жанр ему навредит |
| [lighthouse-uikit](https://github.com/studioigor/lighthouse-uikit) | Код готового web UIKit + **`reference-uikit`**: компоненты по 2 скриншотам, живой текст, адаптивность и проверка 320/390px | LICENSE нет; **дополнительно установлен только навык** в `.agents/skills/reference-uikit/` по просьбе владельца; морской арт и демо UIKit не переносились в Vikings V2 |
| [godot-tutorial-part1](https://github.com/studioigor/godot-tutorial-part1) | Godot/GDScript Pixel Dungeon урок | LICENSE нет; не наш движок |
| [godot-tutorial-part2](https://github.com/studioigor/godot-tutorial-part2) | Godot/GDScript Pixel Dungeon урок | LICENSE нет; не наш движок |
| [godot-tutorial-part3](https://github.com/studioigor/godot-tutorial-part3) | Godot/GDScript Pixel Dungeon урок | LICENSE нет; не наш движок |
| [godot-tutorial-part4](https://github.com/studioigor/godot-tutorial-part4) | Godot/GDScript Pixel Dungeon урок | LICENSE нет; не наш движок |
| [godot-tutorial-part5](https://github.com/studioigor/godot-tutorial-part5) | Godot/GDScript Pixel Dungeon урок | LICENSE нет; не наш движок |
| [fable-51-vs-5](https://github.com/studioigor/fable-51-vs-5) | Слепое сравнение двух версий ИИ на FPS и мини-RTS в Three.js | LICENSE нет; референс для методологии тестирования, не компонент V2 |
| [gpt56-fable5-blind-test](https://github.com/studioigor/gpt56-fable5-blind-test) | 12 браузерных 3D игр от 4 моделей и слепое сравнение | LICENSE нет; демонстрация оценки результатов, не база нашей игры |

## Что внедрено и проверено

1. **Уже было:** MIT `ref2game` для изолированных 2D-ригов и покадровых проверок, `art:workshop:prepare`, `art:workshop:check`, GitHub Actions.
2. **Добавлено сейчас:** MIT-скрипт `tools/animation-review/contact_sheet.py` с оригинальной лицензией. Создаёт покадровый JPEG из MP4 и наглядное сравнение двух видео. Для следующего боя/героя нет необходимости вручную ловить фазы движения на телефоне.
3. **Добавлено сейчас:** MIT-скрипт `tools/agent-qa/ui-diff-check.sh` и `.studio/zones.conf`. ИИ, которому поручено «сделать кнопки красивее», не сможет незаметно выдать редактирование боевой логики за обычный UI без предупреждения в отчёте.
4. **Дальнейшее дополнение:** отдельно импортированы браузерный конвертер `3d-to-2d` и **только скилл** `reference-uikit`. Источники и ограничения — [в специальной инструкции](STUDIOIGOR_CREATIVE_ADDONS_20261025_RU.md); чужой морской арт и 3D-модели не переносились. Принцип A/B по одной камере и законченному циклу (`gauntlet-loop`) остаётся методикой без копирования кода.

Команды:

```bash
npm run art:video:sheet -- input.mp4 --range 1:4:0.15 --cols 5 --out .workshop/review.jpg
npm run art:video:compare -- before.mp4 after.mp4 --out .workshop/side-by-side.mp4
npm run qa:ui-diff -- feature-branch origin/main
npm run qa:studio-tools
npm run qa:creative-addons
```

## Риски и честные ограничения

- Наличие GitHub-репозитория ≠ лицензия на использование в коммерческой игре. Сторонние шрифты, модели, изображения и клипы имеют отдельные условия.
- Перенесённые скрипты **не запускаются автоматически в пользовательской игре**. Они работают в dev-процессе и не попадают в мобильный бандл.
- `contact_sheet.py` требует Python/Pillow и установленный ffmpeg для анализа MP4; он не создаёт сами анимации. Проверка суставов в `ref2game/qa.mjs` требует отдельного WebGL-прототипа и Playwright.
- UI-скрипт **показывает файлы для ревью**, не понимает их смысл и не заменяет анализ изменений экономических операций/сохранений.
- Для настоящего непрерывного 2D-боя сначала нужен готовый персонаж с нарисованными частями, корректным ригом и измеренными атаками; кнопка «установить скилл» не превращает старую статичную картинку в живого бойца.
