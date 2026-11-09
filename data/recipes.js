/*
 * THE MANIFESTO: recipes I've cooked. Order here = order (and numbering) on the site.
 *
 * Copy an entry to add a recipe. Fields:
 *   slug       url id, lowercase-with-dashes, unique (required)     -> cook.jzeng.io/#/r/<slug>
 *   title      the name as you'd write it; Chinese is fine (required)
 *   py         pinyin for a Chinese title (optional)
 *   en         English name (optional)
 *   category   short label used by the index filters
 *   tags       [string]
 *   status     "draft" while amounts or steps are still missing (shows a Draft badge)
 *   serves     number, if known: the scaler then counts servings instead of 1x / 2x
 *   time       free text, e.g. "1 hr 30 min"
 *   photo      e.g. "assets/photos/apple-pie.jpg" (optional; otherwise a generated plate is shown)
 *   hue        0-360, colour of the generated plate (optional)
 *   added      "YYYY-MM-DD" (optional)
 *   intro      a sentence or two (optional)
 *   sections   [{ title, zh?, kind: "ingredients" | "steps", items: [...] }]
 *     ingredient items:  "2 cups flour"   or   { text: "2 cups flour", en?, note?, check? }
 *       - an amount at the START of text scales and converts: "2 cups", "1/4 - 1/2 tsp", "1.5 sticks", "20 g"
 *       - en: English for a Chinese ingredient    note: small grey note    check: true = amount not confirmed yet
 *     step items:  "Bake at 375 degrees F for 50 - 55 minutes"   or   { text, note? }
 *       - times ("50 - 55 minutes", "an hour") become tap-to-start timers
 *       - temperatures ("375 degrees F", "190 °C") convert with the units setting
 *   notes      [string]
 */
CM.recipes = [
    {
        slug: "sheng-jian-bao",
        title: "生煎包",
        py: "shēngjiān bāo",
        en: "Pan-fried pork buns",
        category: "Buns & dumplings",
        tags: ["pork", "pan-fried", "dough"],
        hue: 32,
        sections: [
            {
                title: "Dough",
                zh: "面",
                kind: "ingredients",
                items: [
                    "2 cups water or milk",
                    "5 cups flour",
                    { text: "1 tbsp sugar", check: true },
                    { text: "¼ tsp baking powder", check: true },
                    { text: "1 tsp oil", check: true },
                ],
            },
            {
                title: "Filling",
                zh: "馅",
                kind: "ingredients",
                items: [
                    { text: "Ground pork", note: "pork shoulder, chopped" },
                    { text: "Ginger", note: "grated" },
                    "Rice wine",
                    { text: "Brown braising sauce and gourmet sauce", note: "or white sugar" },
                    { text: "Soy sauce", note: "or salt" },
                    "Chicken stock",
                    "Cabbage",
                    "Dried mushroom",
                    { text: "Shrimp", note: "optional" },
                    "Green onion",
                ],
            },
            {
                title: "Steps",
                kind: "steps",
                items: [
                    { text: "Set the 包子 in the pan with oil and heat it up.", note: "Best to have a full pan." },
                    { text: "Pour in boiling water with a little salt or vinegar, up to mid-height." },
                ],
            },
        ],
    },
    {
        slug: "zha-xia",
        title: "炸虾",
        py: "zhá xiā",
        en: "Fried shrimp",
        category: "Seafood",
        tags: ["shrimp", "fried", "garlic"],
        hue: 14,
        sections: [
            {
                title: "Ingredients",
                kind: "ingredients",
                items: [
                    { text: "虾", en: "shrimp" },
                    { text: "Cornstarch", note: "or 地瓜粉" },
                    "Garlic",
                    "White pepper",
                    { text: "Spices", note: "to your liking" },
                ],
            },
            {
                title: "Steps",
                kind: "steps",
                items: [
                    "Coat the shrimp in cornstarch or 地瓜粉 and fry. Take them out for now.",
                    "爆炒 the garlic, then put the 虾 back in.",
                    "Add white pepper and spices to your liking.",
                ],
            },
        ],
    },
    {
        slug: "dang-gui-xia",
        title: "当归虾",
        py: "dāngguī xiā",
        en: "Dong quai shrimp",
        category: "Herbal",
        tags: ["shrimp", "herbal"],
        status: "draft",
        hue: 150,
        sections: [
            {
                title: "Ingredients",
                kind: "ingredients",
                items: [
                    {
                        text: "黄芪",
                        en: "astragalus root",
                        note: "Gives energy; stops sweating by closing pores (?); heals, revitalizes and helps circulation.",
                    },
                    { text: "甘草", en: "licorice root", note: "Gives a sweet profile; neutralizes." },
                    { text: "熟地", en: "prepared rehmannia root", note: "Makes the brown colour." },
                    { text: "当归", en: "dong quai", note: "The most important one." },
                ],
            },
        ],
    },
    {
        slug: "gui-qi-yang",
        title: "归芪羊",
        py: "guī qí yáng",
        en: "Dong quai and astragalus lamb",
        category: "Herbal",
        tags: ["lamb", "herbal"],
        status: "draft",
        hue: 96,
        sections: [
            {
                title: "Version 1",
                kind: "ingredients",
                items: [
                    { text: "羊肉", en: "lamb" },
                    { text: "黄芪", en: "astragalus root" },
                    { text: "当归", en: "dong quai" },
                ],
            },
            {
                title: "Version 2",
                kind: "ingredients",
                items: [
                    { text: "羊肉", en: "lamb" },
                    { text: "黄芪", en: "astragalus root" },
                    { text: "白术", en: "atractylodes rhizome" },
                ],
            },
        ],
    },
    {
        slug: "ba-zhen-ya",
        title: "八珍鸭",
        py: "bāzhēn yā",
        en: "Eight-treasure herbal duck",
        category: "Herbal",
        tags: ["duck", "herbal"],
        status: "draft",
        hue: 200,
        sections: [
            {
                title: "The eight herbs",
                kind: "ingredients",
                items: [
                    { text: "20 g 党参", en: "codonopsis root" },
                    { text: "15 g 川芎", en: "Sichuan lovage root" },
                    { text: "25 g 熟地", en: "prepared rehmannia root" },
                    { text: "15 g 当归", en: "dong quai" },
                    { text: "15 g 白术", en: "atractylodes rhizome" },
                    { text: "20 g 茯苓", en: "poria" },
                    { text: "10 g 甘草", en: "licorice root" },
                    { text: "20 g 白芍", en: "white peony root" },
                ],
            },
            {
                title: "Steps",
                kind: "steps",
                items: [
                    {
                        text: "Boil once with the herbs, then pour out the first water.",
                        note: "Dried herbs can pick up preservatives or coatings that aren't good for the body nowadays, which is why the first batch of water gets poured out.",
                    },
                ],
            },
        ],
    },
    {
        slug: "apple-pie",
        title: "苹果派",
        py: "píngguǒ pài",
        en: "Apple pie",
        category: "Baking",
        tags: ["dessert", "pie", "apples"],
        hue: 44,
        sections: [
            {
                title: "Dough",
                kind: "ingredients",
                items: [
                    "2.5 cups flour",
                    { text: "¼ - 1 tsp salt", note: "optional" },
                    "1.5 sticks of butter",
                    "¼ - ½ cup water",
                    { text: "1 egg", note: "optional" },
                    { text: "4 tsp sugar", note: "optional" },
                ],
            },
            {
                title: "Filling",
                kind: "ingredients",
                items: [
                    { text: "Apples", note: "skinned and sliced; leave at room temp so they release their juice" },
                    "¾ or ⅔ cup brown sugar",
                    { text: "White sugar", note: "a bit" },
                    "2 tsp flour",
                    { text: "¼ - ½ tsp salt", note: "optional" },
                    "1 tsp cinnamon",
                    "¾ - 1 tsp nutmeg",
                    "2 tbsp lemon juice",
                ],
            },
            {
                title: "Finish",
                kind: "ingredients",
                items: [
                    { text: "Egg", note: "for the egg wash" },
                    { text: "Sugar", note: "for sprinkling" },
                ],
            },
            {
                title: "Steps",
                kind: "steps",
                items: [
                    "Make the dough and refrigerate it for an hour.",
                    "Mix the filling and refrigerate it while the oven preheats.",
                    {
                        text: "Put the crust and filling on the tray, then egg wash and sprinkle with sugar.",
                        note: "Don't egg wash before refrigerating.",
                    },
                    "Cut slits in the center.",
                    "Bake at 375 - 425 degrees F for 50 - 55 minutes on the lower third of the oven.",
                ],
            },
        ],
    },
];
