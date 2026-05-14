// auto-generated from prices.json + preparation.json
window.VM_SERVICES = [
  {
    "id": "uzi-bp-001",
    "name": "УЗИ брюшной полости",
    "category": "diagnostics",
    "categoryLabel": "Диагностика",
    "species": [
      "dog",
      "cat"
    ],
    "price": 1800,
    "duration": 25,
    "prepRef": "prep-uzi-bp"
  },
  {
    "id": "uzi-heart-001",
    "name": "Эхокардиография (УЗИ сердца)",
    "category": "diagnostics",
    "categoryLabel": "Диагностика",
    "species": [
      "dog",
      "cat"
    ],
    "price": 2500,
    "duration": 30,
    "prepRef": "prep-echo"
  },
  {
    "id": "vac-comp-001",
    "name": "Вакцинация комплексная",
    "category": "prevention",
    "categoryLabel": "Профилактика",
    "species": [
      "dog",
      "cat"
    ],
    "price": 1500,
    "duration": 15,
    "prepRef": "prep-vaccine"
  },
  {
    "id": "vac-rabies-001",
    "name": "Вакцинация от бешенства",
    "category": "prevention",
    "categoryLabel": "Профилактика",
    "species": [
      "dog",
      "cat",
      "ferret"
    ],
    "price": 800,
    "duration": 10,
    "prepRef": "prep-vaccine"
  },
  {
    "id": "ster-cat-001",
    "name": "Стерилизация кошки",
    "category": "surgery",
    "categoryLabel": "Хирургия",
    "species": [
      "cat"
    ],
    "price": 4500,
    "duration": 60,
    "prepRef": "prep-surgery"
  },
  {
    "id": "kast-cat-001",
    "name": "Кастрация кота",
    "category": "surgery",
    "categoryLabel": "Хирургия",
    "species": [
      "cat"
    ],
    "price": 2500,
    "duration": 30,
    "prepRef": "prep-surgery"
  },
  {
    "id": "ster-dog-001",
    "name": "Стерилизация собаки",
    "category": "surgery",
    "categoryLabel": "Хирургия",
    "species": [
      "dog"
    ],
    "price": 6500,
    "duration": 90,
    "prepRef": "prep-surgery"
  },
  {
    "id": "chip-001",
    "name": "Чипирование",
    "category": "prevention",
    "categoryLabel": "Профилактика",
    "species": [
      "dog",
      "cat",
      "ferret",
      "rabbit"
    ],
    "price": 1200,
    "duration": 10,
    "prepRef": null
  },
  {
    "id": "ct-001",
    "name": "Компьютерная томография (КТ)",
    "category": "diagnostics",
    "categoryLabel": "Диагностика",
    "species": [
      "dog",
      "cat"
    ],
    "price": 6500,
    "duration": 45,
    "prepRef": "prep-ct"
  },
  {
    "id": "rentgen-001",
    "name": "Рентген",
    "category": "diagnostics",
    "categoryLabel": "Диагностика",
    "species": [
      "dog",
      "cat",
      "ferret",
      "rabbit"
    ],
    "price": 1200,
    "duration": 15,
    "prepRef": null
  },
  {
    "id": "blood-oak-001",
    "name": "Общий анализ крови (ОАК)",
    "category": "lab",
    "categoryLabel": "Анализы",
    "species": [
      "dog",
      "cat",
      "ferret",
      "rabbit"
    ],
    "price": 900,
    "duration": 5,
    "prepRef": "prep-blood"
  },
  {
    "id": "blood-bio-001",
    "name": "Биохимия крови",
    "category": "lab",
    "categoryLabel": "Анализы",
    "species": [
      "dog",
      "cat",
      "ferret",
      "rabbit"
    ],
    "price": 2400,
    "duration": 5,
    "prepRef": "prep-blood"
  },
  {
    "id": "consult-therap-001",
    "name": "Консультация терапевта",
    "category": "consultation",
    "categoryLabel": "Консультация",
    "species": [
      "dog",
      "cat",
      "ferret",
      "rabbit"
    ],
    "price": 1000,
    "duration": 30,
    "prepRef": null
  },
  {
    "id": "consult-surg-001",
    "name": "Консультация хирурга",
    "category": "consultation",
    "categoryLabel": "Консультация",
    "species": [
      "dog",
      "cat"
    ],
    "price": 1200,
    "duration": 30,
    "prepRef": null
  },
  {
    "id": "endo-001",
    "name": "Эндоскопия",
    "category": "diagnostics",
    "categoryLabel": "Диагностика",
    "species": [
      "dog",
      "cat"
    ],
    "price": 5500,
    "duration": 40,
    "prepRef": "prep-endo"
  },
  {
    "id": "dental-cleaning-001",
    "name": "Чистка зубов ультразвуком",
    "category": "dental",
    "categoryLabel": "Стоматология",
    "species": [
      "dog",
      "cat"
    ],
    "price": 3500,
    "duration": 60,
    "prepRef": "prep-dental"
  },
  {
    "id": "dental-xray-001",
    "name": "Дентальный рентген",
    "category": "dental",
    "categoryLabel": "Стоматология",
    "species": [
      "dog",
      "cat"
    ],
    "price": 1500,
    "duration": 15,
    "prepRef": null
  }
];
window.VM_PREP = [
  {
    "id": "prep-uzi-bp",
    "title": "Подготовка к УЗИ брюшной полости",
    "content": "Голодная пауза 8-12 часов до процедуры. Воду не давать за 2 часа до приёма. За 30 минут до визита дайте животному возможность опорожнить мочевой пузырь. Длительность процедуры — около 25 минут. С собой можно взять любимое лакомство для поощрения после исследования.",
    "species": [
      "dog",
      "cat"
    ]
  },
  {
    "id": "prep-echo",
    "title": "Подготовка к Эхокардиографии",
    "content": "Специальная подготовка не требуется. За 2-3 часа до приёма можно покормить, но не плотно. Желательно приехать заранее, чтобы животное успокоилось перед процедурой — стресс влияет на работу сердца и может исказить результаты. Длительность около 30 минут.",
    "species": [
      "dog",
      "cat"
    ]
  },
  {
    "id": "prep-vaccine",
    "title": "Подготовка к вакцинации",
    "content": "Животное должно быть клинически здорово (нет температуры, выделений из глаз и носа, диареи). За 10-14 дней до прививки нужна обработка от глистов (антигельминтик). Не вакцинируйте в день стресса (после переезда, операции, смены корма). С собой возьмите ветеринарный паспорт. Если паспорта нет — оформим в день приёма.",
    "species": [
      "dog",
      "cat"
    ]
  },
  {
    "id": "prep-surgery",
    "title": "Подготовка к плановой операции (стерилизация, кастрация)",
    "content": "Голодная пауза 12 часов. Воду не давать за 2 часа до операции. Перед операцией нужны анализы крови — общий и биохимия. Их можно сдать у нас за 1-2 дня до операции или принести готовые (срок не более 7 дней). По показаниям также может понадобиться УЗИ сердца — врач скажет. С собой возьмите ветпаспорт, переноску с тёплой подстилкой и пелёнку для постоперационного периода.",
    "species": [
      "dog",
      "cat"
    ]
  },
  {
    "id": "prep-ct",
    "title": "Подготовка к КТ",
    "content": "КТ проводится под седацией (лёгкий медикаментозный сон), поэтому требуется голодная пауза 8-12 часов. Перед процедурой обязательны анализы крови — биохимия — для оценки переносимости седации. Длительность исследования около 45 минут плюс время на седацию и пробуждение. По окончании желательно остаться в клинике 1-2 часа до полного выхода из седации.",
    "species": [
      "dog",
      "cat"
    ]
  },
  {
    "id": "prep-blood",
    "title": "Подготовка к анализам крови",
    "content": "Для биохимии желательна голодная пауза 6-8 часов (исключение — щенки и котята до 4 месяцев, им долгое голодание противопоказано). Перед сдачей крови ограничьте физические нагрузки. Воду давать можно. Если животное получает препараты — обязательно сообщите врачу, некоторые могут влиять на результаты.",
    "species": [
      "dog",
      "cat",
      "ferret",
      "rabbit"
    ]
  },
  {
    "id": "prep-endo",
    "title": "Подготовка к эндоскопии",
    "content": "Голодная пауза 12-18 часов (зависит от типа исследования — врач уточнит). Воду не давать за 4 часа до процедуры. Эндоскопия проводится под наркозом, поэтому нужны актуальные анализы крови. После процедуры животное несколько часов остаётся в клинике под наблюдением.",
    "species": [
      "dog",
      "cat"
    ]
  },
  {
    "id": "prep-dental",
    "title": "Подготовка к чистке зубов",
    "content": "Чистка зубов ультразвуком проводится только под общей анестезией — это нужно, чтобы качественно обработать всю ротовую полость, включая поддесневой налёт. Голодная пауза 12 часов. Нужны анализы крови (биохимия) и осмотр терапевта перед процедурой. Кошкам старше 8 лет и брахицефалам (мопсы, персы, британцы) дополнительно может понадобиться эхокардиография.",
    "species": [
      "dog",
      "cat"
    ]
  }
];
