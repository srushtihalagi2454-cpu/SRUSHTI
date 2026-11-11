import { RestaurantMenu, MenuItem, DiningBill, BillItem, Reservation } from '../types';

// Specialized menu for The Ember Room (Indiranagar - Contemporary Indian Hearth)
const EMBER_ROOM_MENU: RestaurantMenu = {
  restaurantId: 'rest-1',
  restaurantName: 'The Ember Room',
  currency: '₹',
  lastUpdated: 'Updated Today • Fresh Hearth Batches',
  categories: [
    {
      name: 'Hearth Starters & Small Plates',
      description: 'Charred over aromatic charcoal and woodfire',
      items: [
        {
          id: 'er-101',
          name: 'Smoked Butter Chicken Terrine',
          description: 'Slow-smoked pulled tandoori chicken, makhani gelée, micro-greens, crisp roomali crisps',
          price: 620,
          category: 'Hearth Starters & Small Plates',
          dietary: 'non-veg',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Butter_Chicken_%26_Butter_Naan_-_Home_-_Chandigarh_-_India_-_0006.jpg/960px-Butter_Chicken_%26_Butter_Naan_-_Home_-_Chandigarh_-_India_-_0006.jpg',
          isChefSpecial: true,
          isBestseller: true,
          isGlutenFree: true,
          dietaryTags: ['Non-Veg', 'Chef Special', 'Gluten-Free'],
          spiceLevel: 'Medium',
          portionSize: 'Serves 2',
        },
        {
          id: 'er-102',
          name: 'Charred Cauliflower in Koji Curry',
          description: 'Hearth-roasted heirloom cauliflower florets, fermented koji coconut curry, toasted curry leaf oil',
          price: 490,
          category: 'Hearth Starters & Small Plates',
          dietary: 'vegan',
          imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
          isChefSpecial: true,
          isGlutenFree: true,
          isJain: true,
          dietaryTags: ['Vegan', 'Gluten-Free', 'Jain Option', 'Chef Special'],
          spiceLevel: 'Mild',
          portionSize: 'Serves 2',
        },
        {
          id: 'er-103',
          name: 'Truffle & Forest Morel Kulcha',
          description: 'Mini baked sourdough kulchas stuffed with wild Himalayan morels, truffle butter glaze, aged cheddar',
          price: 540,
          category: 'Hearth Starters & Small Plates',
          dietary: 'veg',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Annapurna_Naan.jpg/960px-Annapurna_Naan.jpg',
          isBestseller: true,
          dietaryTags: ['Vegetarian', 'Bestseller'],
          spiceLevel: 'Mild',
          portionSize: '3 Pieces',
        },
        {
          id: 'er-104',
          name: 'Hearth Charred Malai Broccoli',
          description: 'Creamy cardamom and cashew marinated broccoli florets, smoked over apricot wood, mint chutney foam',
          price: 460,
          category: 'Hearth Starters & Small Plates',
          dietary: 'veg',
          imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
          containsNuts: true,
          isGlutenFree: true,
          isJain: true,
          dietaryTags: ['Vegetarian', 'Contains Nuts', 'Gluten-Free', 'Jain Option'],
          spiceLevel: 'Mild',
          portionSize: 'Serves 2',
        },
        {
          id: 'er-105',
          name: 'Sigri Spiced Lamb Chops',
          description: 'New Zealand lamb chops seared on sigri coals, crushed coriander seed rub, pomegranate molasses glaze',
          price: 890,
          category: 'Hearth Starters & Small Plates',
          dietary: 'non-veg',
          imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
          isChefSpecial: true,
          isGlutenFree: true,
          dietaryTags: ['Non-Veg', 'Chef Special', 'Gluten-Free'],
          spiceLevel: 'Spicy',
          portionSize: '3 Chops',
        },
        {
          id: 'er-106',
          name: 'Crispy Lotus Stem in Kokum Glaze',
          description: 'Wok-tossed lotus stem chips with sweet tamarind, tangy kokum reduction, and roasted sesame',
          price: 420,
          category: 'Hearth Starters & Small Plates',
          dietary: 'vegan',
          imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
          isGlutenFree: true,
          isJain: true,
          dietaryTags: ['Vegan', 'Gluten-Free', 'Jain Option'],
          spiceLevel: 'Medium',
          portionSize: 'Serves 2',
        },
      ],
    },
    {
      name: 'Claypot Mains & Curries',
      description: 'Slow-simmered in artisanal earthen pots and iron handis',
      items: [
        {
          id: 'er-201',
          name: 'Rampuri Lamb Shank Nihari',
          description: '12-hour braised lamb shank in traditional aromatic bone broth, ginger juliennes, saffron essence',
          price: 920,
          category: 'Claypot Mains & Curries',
          dietary: 'non-veg',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Nalli_Nihari_India.jpg/960px-Nalli_Nihari_India.jpg',
          isChefSpecial: true,
          isBestseller: true,
          isGlutenFree: true,
          dietaryTags: ['Non-Veg', 'Chef Special', 'Gluten-Free'],
          spiceLevel: 'Medium',
          portionSize: 'Serves 1-2',
        },
        {
          id: 'er-202',
          name: 'Old Delhi Smoked Butter Chicken',
          description: 'Boneless chicken thighs cooked in charcoal-smoked velvet tomato gravy, churned white butter, fenugreek dust',
          price: 680,
          category: 'Claypot Mains & Curries',
          dietary: 'non-veg',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Butter_Chicken_%26_Butter_Naan_-_Home_-_Chandigarh_-_India_-_0006.jpg/960px-Butter_Chicken_%26_Butter_Naan_-_Home_-_Chandigarh_-_India_-_0006.jpg',
          isBestseller: true,
          isGlutenFree: true,
          containsNuts: true,
          dietaryTags: ['Non-Veg', 'Bestseller', 'Contains Nuts'],
          spiceLevel: 'Mild',
          portionSize: 'Serves 2',
        },
        {
          id: 'er-203',
          name: 'Hearth Smoked Paneer Tikka Masala',
          description: 'Farm-fresh cottage cheese cubes charred in tandoor, spiced bell pepper lababdar sauce',
          price: 580,
          category: 'Claypot Mains & Curries',
          dietary: 'veg',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Paneer_tikka.jpg/960px-Paneer_tikka.jpg',
          isGlutenFree: true,
          isJain: true,
          containsNuts: true,
          dietaryTags: ['Vegetarian', 'Jain Option', 'Contains Nuts'],
          spiceLevel: 'Medium',
          portionSize: 'Serves 2',
        },
        {
          id: 'er-204',
          name: 'Slow-Simmered Dal Ember',
          description: 'Our 24-hour slow-cooked black lentils simmered with country tomatoes, clarified butter, and dried kasoori methi',
          price: 520,
          category: 'Claypot Mains & Curries',
          dietary: 'veg',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Punjabi_style_Dal_Makhani.jpg/960px-Punjabi_style_Dal_Makhani.jpg',
          isChefSpecial: true,
          isGlutenFree: true,
          isJain: true,
          dietaryTags: ['Vegetarian', 'Chef Special', 'Gluten-Free', 'Jain Option'],
          spiceLevel: 'Mild',
          portionSize: 'Serves 2',
        },
        {
          id: 'er-205',
          name: 'Coorg Pepper Mushroom Rogan',
          description: 'Wild button and shiitake mushrooms tossed in freshly crushed Tellicherry peppercorn gravy and shallots',
          price: 540,
          category: 'Claypot Mains & Curries',
          dietary: 'vegan',
          imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
          isGlutenFree: true,
          dietaryTags: ['Vegan', 'Gluten-Free'],
          spiceLevel: 'Spicy',
          portionSize: 'Serves 2',
        },
        {
          id: 'er-206',
          name: 'Konkan Rawas Fish Curry',
          description: 'Fresh Indian salmon simmered in coastal coconut milk, freshly ground byadagi chilli paste and raw mango',
          price: 840,
          category: 'Claypot Mains & Curries',
          dietary: 'non-veg',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/South_Indian_Fish_Curry.jpg/960px-South_Indian_Fish_Curry.jpg',
          isGlutenFree: true,
          dietaryTags: ['Non-Veg', 'Gluten-Free'],
          spiceLevel: 'Medium',
          portionSize: 'Serves 2',
        },
      ],
    },
    {
      name: 'Artisanal Breads & Fragrant Rice',
      description: 'Baked to order in our 450°C clay tandoor',
      items: [
        {
          id: 'er-301',
          name: 'Smoked Garlic & Rosemary Naan',
          description: 'Airy leavened flatbread brushed with roasted confit garlic butter and fresh rosemary sprigs',
          price: 180,
          category: 'Artisanal Breads & Fragrant Rice',
          dietary: 'veg',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Annapurna_Naan.jpg/960px-Annapurna_Naan.jpg',
          dietaryTags: ['Vegetarian'],
          portionSize: '2 Pieces',
        },
        {
          id: 'er-302',
          name: 'Chur Chur Laccha Paratha',
          description: 'Multi-layered crispy flaky whole wheat bread crushed by hand with spiced desi ghee',
          price: 160,
          category: 'Artisanal Breads & Fragrant Rice',
          dietary: 'veg',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Triangle_paratha_%28cropped%29.JPG/960px-Triangle_paratha_%28cropped%29.JPG',
          dietaryTags: ['Vegetarian'],
          portionSize: '1 Large',
        },
        {
          id: 'er-303',
          name: 'Truffle Wild Mushroom Pulao',
          description: 'Fragrant aged Basmati rice tossed with sautéed wild chanterelles, white truffle oil, fried onions',
          price: 480,
          category: 'Artisanal Breads & Fragrant Rice',
          dietary: 'veg',
          imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
          isChefSpecial: true,
          isGlutenFree: true,
          isJain: true,
          dietaryTags: ['Vegetarian', 'Chef Special', 'Gluten-Free', 'Jain Option'],
          portionSize: 'Serves 2',
        },
        {
          id: 'er-304',
          name: 'Awadhi Murgh Dum Biryani',
          description: 'Layered Basmati rice and tender chicken sealed with dough in earthen handi, saffron milk and kewra water',
          price: 650,
          category: 'Artisanal Breads & Fragrant Rice',
          dietary: 'non-veg',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/%22Hyderabadi_Dum_Biryani%22.jpg/960px-%22Hyderabadi_Dum_Biryani%22.jpg',
          isBestseller: true,
          isGlutenFree: true,
          dietaryTags: ['Non-Veg', 'Bestseller', 'Gluten-Free'],
          spiceLevel: 'Medium',
          portionSize: 'Serves 2 with Burani Raita',
        },
        {
          id: 'er-305',
          name: 'Steamed Aged Basmati Rice',
          description: 'Long grain fragrant rice tempered with royal cumin and whole green cardamom pods',
          price: 220,
          category: 'Artisanal Breads & Fragrant Rice',
          dietary: 'vegan',
          imageUrl: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=600&q=80',
          isGlutenFree: true,
          isJain: true,
          dietaryTags: ['Vegan', 'Gluten-Free', 'Jain Option'],
          portionSize: 'Serves 2',
        },
      ],
    },
    {
      name: 'Desserts & Sweet Endings',
      description: 'Modern interpretations of regional Indian confections',
      items: [
        {
          id: 'er-401',
          name: 'Filter Coffee Tiramisu',
          description: 'Chikmagalur dark roast soaked savoiardi biscuits, mascarpone mousse, jaggery cocoa dust',
          price: 440,
          category: 'Desserts & Sweet Endings',
          dietary: 'veg',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Tiramisu_-_Raffaele_Diomede.jpg/960px-Tiramisu_-_Raffaele_Diomede.jpg',
          hasEgg: true,
          isChefSpecial: true,
          isBestseller: true,
          dietaryTags: ['Vegetarian', 'Contains Egg', 'Chef Special'],
          portionSize: '1 Portion',
        },
        {
          id: 'er-402',
          name: 'Gulkand Baked Rasgulla Brulee',
          description: 'Delicate cottage cheese spheres soaked in rose petal compote with caramelized sugar crust',
          price: 390,
          category: 'Desserts & Sweet Endings',
          dietary: 'veg',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Rasgulla.jpg/960px-Rasgulla.jpg',
          isGlutenFree: true,
          isJain: true,
          dietaryTags: ['Vegetarian', 'Gluten-Free', 'Jain Option'],
          portionSize: '2 Pieces',
        },
        {
          id: 'er-403',
          name: 'Dark Chocolate & Jaggery Fondant',
          description: 'Warm molten 70% dark chocolate cake sweetened with organic palm jaggery, cardamom ice cream',
          price: 460,
          category: 'Desserts & Sweet Endings',
          dietary: 'veg',
          imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
          hasEgg: true,
          dietaryTags: ['Vegetarian', 'Contains Egg'],
          portionSize: '1 Plated',
        },
        {
          id: 'er-404',
          name: 'Saffron & Pistachio Kulfi Pop',
          description: 'Traditional slow-reduced malai kulfi, saffron strands, toasted Afghan pistachios, silver leaf',
          price: 320,
          category: 'Desserts & Sweet Endings',
          dietary: 'veg',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Matka_kulfi.jpg',
          containsNuts: true,
          isGlutenFree: true,
          isJain: true,
          dietaryTags: ['Vegetarian', 'Contains Nuts', 'Gluten-Free', 'Jain Option'],
          portionSize: 'Single Pop',
        },
      ],
    },
    {
      name: 'Beverages',
      description: 'Zero-proof artisanal drinks and cold-pressed elixirs',
      items: [
        {
          id: 'er-501',
          name: 'Smoked Aam Panna Soda',
          description: 'Charred raw mango pulp, rock salt, roasted cumin, topped with chilled effervescent soda',
          price: 280,
          category: 'Beverages',
          dietary: 'vegan',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Keri_Ka_Sharbat.JPG/960px-Keri_Ka_Sharbat.JPG',
          isChefSpecial: true,
          isGlutenFree: true,
          isJain: true,
          dietaryTags: ['Vegan', 'Gluten-Free', 'Jain Option', 'Chef Special'],
        },
        {
          id: 'er-502',
          name: 'Jamun & Black Salt Shrub',
          description: 'Wild Indian blackberry reduction, apple cider shrub, club soda, pink Himalayan salt rim',
          price: 290,
          category: 'Beverages',
          dietary: 'vegan',
          imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
          isBestseller: true,
          isGlutenFree: true,
          isJain: true,
          dietaryTags: ['Vegan', 'Gluten-Free', 'Jain Option', 'Bestseller'],
        },
        {
          id: 'er-503',
          name: 'Kashmiri Kahwa & Saffron Brew',
          description: 'Green tea simmered with saffron stigmas, cinnamon sticks, whole cardamoms, and almond slivers',
          price: 240,
          category: 'Beverages',
          dietary: 'vegan',
          imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
          containsNuts: true,
          isGlutenFree: true,
          isJain: true,
          dietaryTags: ['Vegan', 'Contains Nuts', 'Gluten-Free', 'Jain Option'],
        },
        {
          id: 'er-504',
          name: 'Chilled Coconut Water with Chia & Basil',
          description: 'Fresh Pollachi tender coconut water, sweet basil seeds, lime squeeze, crushed ice',
          price: 220,
          category: 'Beverages',
          dietary: 'vegan',
          imageUrl: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80',
          isGlutenFree: true,
          isJain: true,
          dietaryTags: ['Vegan', 'Gluten-Free', 'Jain Option'],
        },
      ],
    },
  ],
};

// Generic Italian menu template
const ITALIAN_MENU_TEMPLATE: (restId: string, restName: string) => RestaurantMenu = (restId, restName) => ({
  restaurantId: restId,
  restaurantName: restName,
  currency: '₹',
  lastUpdated: 'Updated Today • Fresh Pasta & Woodfired Dough',
  categories: [
    {
      name: 'Antipasti & Small Plates',
      description: 'Handcrafted appetizers and burrata creations',
      items: [
        { id: `${restId}-1`, name: 'Truffle Burrata Pugliese', description: 'Fresh 200g artisanal burrata, heirloom cherry tomatoes, basil pesto, black truffle oil drizzle', price: 680, category: 'Antipasti & Small Plates', dietary: 'veg', isChefSpecial: true, isBestseller: true },
        { id: `${restId}-2`, name: 'Bruschetta Trio', description: 'Grilled sourdough with wild mushroom, classic pomodoro basil, and roasted bell pepper caponata', price: 440, category: 'Antipasti & Small Plates', dietary: 'veg' },
        { id: `${restId}-3`, name: 'Crispy Calamari Fritti', description: 'Semolina-crusted golden squid rings, smoked garlic aioli, charred lemon wedge', price: 590, category: 'Antipasti & Small Plates', dietary: 'non-veg' },
        { id: `${restId}-4`, name: 'Arancini ai Funghi', description: 'Crispy risotto spheres stuffed with forest mushrooms and mozzarella, pomodoro dipping sauce', price: 460, category: 'Antipasti & Small Plates', dietary: 'veg' },
        { id: `${restId}-5`, name: 'Prosciutto e Melone Salad', description: 'Thinly shaved Parma ham, sweet rock melon, arugula, 12-year aged balsamic reduction', price: 720, category: 'Antipasti & Small Plates', dietary: 'non-veg' },
      ],
    },
    {
      name: 'Woodfired Neapolitan Pizzas',
      description: '48-hour fermented sourdough crust baked at 480°C in oak wood oven',
      items: [
        { id: `${restId}-6`, name: 'Margherita D.O.P.', description: 'San Marzano tomato sauce, fior di latte mozzarella, fresh organic basil, extra virgin olive oil', price: 620, category: 'Woodfired Neapolitan Pizzas', dietary: 'veg', isBestseller: true },
        { id: `${restId}-7`, name: 'Quattro Formaggi con Tartufo', description: 'Gorgonzola, fontina, fresh mozzarella, aged parmesan, drizzled with white truffle honey', price: 780, category: 'Woodfired Neapolitan Pizzas', dietary: 'veg', isChefSpecial: true },
        { id: `${restId}-8`, name: 'Diavola Pepperoni', description: 'Spicy imported pork pepperoni, crushed Calabrian chilies, tomato sauce, mozzarella', price: 820, category: 'Woodfired Neapolitan Pizzas', dietary: 'non-veg', isBestseller: true },
        { id: `${restId}-9`, name: 'Ortolana Garden Harvest', description: 'Grilled zucchini, roasted bell peppers, sun-dried tomatoes, kalamata olives, vegan mozzarella', price: 650, category: 'Woodfired Neapolitan Pizzas', dietary: 'vegan' },
        { id: `${restId}-10`, name: 'Smoked Pollo & Jalapeño', description: 'Herb-marinated grilled chicken breast, pickled jalapeños, red onions, garlic olive oil', price: 740, category: 'Woodfired Neapolitan Pizzas', dietary: 'non-veg' },
      ],
    },
    {
      name: 'Handmade Pasta & Risotto',
      description: 'Extruded fresh daily using Italian bronze dies',
      items: [
        { id: `${restId}-11`, name: 'Handmade Spinach & Ricotta Ravioli', description: 'Pillow pasta stuffed with fresh ricotta and baby spinach in sage brown butter sauce with toasted pine nuts', price: 640, category: 'Handmade Pasta & Risotto', dietary: 'veg', isChefSpecial: true },
        { id: `${restId}-12`, name: 'Classic Tagliatelle alla Bolognese', description: 'Slow-simmered beef and pork ragù, San Marzano tomatoes, freshly grated Parmigiano Reggiano', price: 760, category: 'Handmade Pasta & Risotto', dietary: 'non-veg' },
        { id: `${restId}-13`, name: 'Wild Forest Mushroom Risotto', description: 'Aged Carnaroli rice, porcini mushroom stock, thyme, butter, 24-month parmesan crisp', price: 690, category: 'Handmade Pasta & Risotto', dietary: 'veg' },
        { id: `${restId}-14`, name: 'Spaghetti Aglio Olio e Peperoncino', description: 'Garlic confit, peperoncino flakes, cold-pressed olive oil, fresh parsley, sourdough crumb', price: 540, category: 'Handmade Pasta & Risotto', dietary: 'vegan' },
        { id: `${restId}-15`, name: 'Fettuccine Gamberi e Limone', description: 'Tiger prawns, ribbon fettuccine, Amalfi lemon butter sauce, capers, baby spinach', price: 790, category: 'Handmade Pasta & Risotto', dietary: 'non-veg' },
      ],
    },
    {
      name: 'Dolci & Desserts',
      description: 'Authentic Italian sweet indulgences',
      items: [
        { id: `${restId}-16`, name: 'Tiramisu Classico Tradizionale', description: 'Espresso-soaked Savoiardi ladyfingers, rich mascarpone cream, Valrhona cocoa powder', price: 450, category: 'Dolci & Desserts', dietary: 'veg', isBestseller: true },
        { id: `${restId}-17`, name: 'Vanilla Bean Panna Cotta', description: 'Silky cooked cream, Madagascar vanilla bean, wild berry compote', price: 380, category: 'Dolci & Desserts', dietary: 'veg' },
        { id: `${restId}-18`, name: 'Warm Chocolate Lava Torte', description: 'Warm molten Belgian dark chocolate cake with hazelnut gelato scoop', price: 440, category: 'Dolci & Desserts', dietary: 'veg' },
        { id: `${restId}-19`, name: 'Artisanal Sicilian Cannoli', description: 'Crisp pastry shells filled with sweet sweetened ricotta, candied orange peel, pistachios', price: 390, category: 'Dolci & Desserts', dietary: 'veg' },
      ],
    },
    {
      name: 'Beverages & Mocktails',
      description: 'Italian sodas and espresso bar',
      items: [
        { id: `${restId}-20`, name: 'San Pellegrino Blood Orange Soda', description: 'Chilled sparkling Italian citrus water with fresh mint and citrus wheel', price: 280, category: 'Beverages & Mocktails', dietary: 'vegan' },
        { id: `${restId}-21`, name: 'Limoncello Zero Spritz', description: 'Non-alcoholic botanical bitter, candied Amalfi lemon syrup, sparkling soda water', price: 310, category: 'Beverages & Mocktails', dietary: 'vegan', isChefSpecial: true },
        { id: `${restId}-22`, name: 'Double Ristretto Espresso', description: 'Freshly extracted Italian dark roast beans with thick golden crema', price: 190, category: 'Beverages & Mocktails', dietary: 'vegan' },
      ],
    },
  ],
});

// Generic South Indian / Coastal menu template
const SOUTH_INDIAN_COASTAL_MENU: (restId: string, restName: string) => RestaurantMenu = (restId, restName) => ({
  restaurantId: restId,
  restaurantName: restName,
  currency: '₹',
  lastUpdated: 'Updated Today • Fresh Catch & Stone-ground Masalas',
  categories: [
    {
      name: 'Coastal & Tawa Starters',
      description: 'Slow-roasted in pure country ghee with Mangalore byadagi chillies',
      items: [
        { id: `${restId}-1`, name: 'Kundapura Ghee Roast Chicken', description: 'Succulent chicken morsels roasted in stone-ground spice paste and aromatic clarified ghee', price: 580, category: 'Coastal & Tawa Starters', dietary: 'non-veg', isChefSpecial: true, isBestseller: true, spiceLevel: 'Spicy' },
        { id: `${restId}-2`, name: 'Paneer Ghee Roast', description: 'Fresh malai paneer cubes charred in Kundapura spice paste, curry leaves, cashews', price: 460, category: 'Coastal & Tawa Starters', dietary: 'veg', isBestseller: true, spiceLevel: 'Medium' },
        { id: `${restId}-3`, name: 'Karavalli Anjal (King Fish) Rawa Fry', description: 'Fresh king fish steak marinated in spicy red masala, coated with crisp semolina and pan fried', price: 740, category: 'Coastal & Tawa Starters', dietary: 'non-veg', isChefSpecial: true, spiceLevel: 'Medium' },
        { id: `${restId}-4`, name: 'Guntur Mushroom Pepper Dry', description: 'Button mushrooms tossed with crushed black Tellicherry peppercorn, shallots, curry leaves', price: 380, category: 'Coastal & Tawa Starters', dietary: 'vegan', spiceLevel: 'Spicy' },
        { id: `${restId}-5`, name: 'Baby Corn Podi Fry', description: 'Crispy fried baby corn tossed in gun-powder idli podi and hot ghee', price: 340, category: 'Coastal & Tawa Starters', dietary: 'veg', spiceLevel: 'Medium' },
      ],
    },
    {
      name: 'Curries & Traditional Gravies',
      description: 'Heritage recipes cooked with freshly grated coconut and tamarind',
      items: [
        { id: `${restId}-6`, name: 'Mangalorean Prawn Curry (Yetti Gassi)', description: 'Jumbo prawns simmered in stone-ground coconut, coriander seeds, and tart kokum gravy', price: 690, category: 'Curries & Traditional Gravies', dietary: 'non-veg', isChefSpecial: true, isBestseller: true, spiceLevel: 'Medium' },
        { id: `${restId}-7`, name: 'Kori Rotti Curry', description: 'Mangalorean spicy coconut chicken curry served alongside paper-thin crisp rice wafers for dipping', price: 560, category: 'Curries & Traditional Gravies', dietary: 'non-veg', isBestseller: true, spiceLevel: 'Spicy' },
        { id: `${restId}-8`, name: 'Malnad Akki Rotti with Kaalu Huli', description: 'Crisp aromatic rice flatbreads served with sprouted field bean coconut stew and tomato chutney', price: 380, category: 'Curries & Traditional Gravies', dietary: 'veg', isChefSpecial: true, spiceLevel: 'Mild' },
        { id: `${restId}-9`, name: 'Alleppey Veg Stew', description: 'Assorted farm carrots, beans, green peas simmered in delicate first-press coconut milk', price: 420, category: 'Curries & Traditional Gravies', dietary: 'vegan', spiceLevel: 'Mild' },
        { id: `${restId}-10`, name: 'Coorg Pandi Curry', description: 'Classic Kodava dark pork curry slow-simmered with roasted black spices and tart Kachampuli fruit vinegar', price: 640, category: 'Curries & Traditional Gravies', dietary: 'non-veg', spiceLevel: 'Spicy' },
        { id: `${restId}-11`, name: 'Bisi Bele Bath with Boondi', description: 'Piping hot Karnataka spiced lentil rice cooked with vegetables and ghee, served with crunchy salted boondi', price: 320, category: 'Curries & Traditional Gravies', dietary: 'veg', isBestseller: true },
      ],
    },
    {
      name: 'Neer Dosa, Appams & Staples',
      description: 'Authentic coastal breads made from fermented rice batter',
      items: [
        { id: `${restId}-12`, name: 'Soft Neer Dosa (4 Pieces)', description: 'Gossamer-thin, soft crêpes made from soaked rice and tender coconut water', price: 190, category: 'Neer Dosa, Appams & Staples', dietary: 'vegan', isBestseller: true },
        { id: `${restId}-13`, name: 'Kerala Malabar Parotta (2 Pieces)', description: 'Flaky layered spiral flatbread, crisp on outside and pillowy soft inside', price: 160, category: 'Neer Dosa, Appams & Staples', dietary: 'veg' },
        { id: `${restId}-14`, name: 'Steamed Appams with Coconut Milk', description: 'Lacy fermented rice hoppers with soft spongy centre, served with sweetened cardamom coconut milk', price: 210, category: 'Neer Dosa, Appams & Staples', dietary: 'vegan' },
        { id: `${restId}-15`, name: 'Ghee Rice with Fried Cashews', description: 'Fragrant Jeera Samba rice cooked with aromatic spices, golden fried onions and cashews', price: 280, category: 'Neer Dosa, Appams & Staples', dietary: 'veg' },
        { id: `${restId}-16`, name: 'Curd Rice with Pomegranate', description: 'Comforting home-set yogurt rice tempered with mustard seeds, curry leaves, and fresh pomegranate gems', price: 220, category: 'Neer Dosa, Appams & Staples', dietary: 'veg' },
      ],
    },
    {
      name: 'Desserts & Sweets',
      description: 'Traditional Karnataka and coastal sweet specialties',
      items: [
        { id: `${restId}-17`, name: 'Elaneer Payasam', description: 'Chilled tender coconut pulp pudding made with coconut cream, milk, and crushed green cardamom', price: 290, category: 'Desserts & Sweets', dietary: 'veg', isChefSpecial: true, isBestseller: true },
        { id: `${restId}-18`, name: 'Melt-in-Mouth Mysore Pak', description: 'Rich fudge made from gram flour, pure country ghee, and caramelized sugar', price: 240, category: 'Desserts & Sweets', dietary: 'veg' },
        { id: `${restId}-19`, name: 'Payasam of the Day', description: 'Warm vermicelli and sago pudding simmered in condensed milk with raisins and cashews', price: 220, category: 'Desserts & Sweets', dietary: 'veg' },
      ],
    },
    {
      name: 'Traditional Beverages',
      description: 'Filter coffee and cooling thirst quenchers',
      items: [
        { id: `${restId}-20`, name: 'South Indian Filter Kaapi', description: 'Freshly decocted 80:20 chicory blend served piping hot in brass davarah and tumbler', price: 140, category: 'Traditional Beverages', dietary: 'veg', isBestseller: true },
        { id: `${restId}-21`, name: 'Nannari Sharbath with Basil Seeds', description: 'Cooling sarsaparilla root syrup with chilled water, lemon juice, and soaked sabja seeds', price: 180, category: 'Traditional Beverages', dietary: 'vegan' },
        { id: `${restId}-22`, name: 'Majige (Spiced Buttermilk)', description: 'Chilled buttermilk churned with ginger, green chillies, curry leaves, and rock salt', price: 120, category: 'Traditional Beverages', dietary: 'veg' },
      ],
    },
  ],
});

// Generic North Indian / Mughlai / Biryani menu template
const MUGHLAI_BIRYANI_MENU: (restId: string, restName: string) => RestaurantMenu = (restId, restName) => ({
  restaurantId: restId,
  restaurantName: restName,
  currency: '₹',
  lastUpdated: 'Updated Today • Slow Dum Sealing & Sigri Tandoor',
  categories: [
    {
      name: 'Tandoori Kebabs & Tikkas',
      description: 'Marinated in yogurt and royal spices, roasted over red-hot charcoal',
      items: [
        { id: `${restId}-1`, name: 'Galouti Kebab with Mini Sheermal', description: 'Melt-in-mouth smoked minced lamb patties seasoned with 32 spices, served on warm saffron bread', price: 640, category: 'Tandoori Kebabs & Tikkas', dietary: 'non-veg', isChefSpecial: true, isBestseller: true },
        { id: `${restId}-2`, name: 'Murgh Malai Tikka', description: 'Boneless chicken cubes marinated in clotted cream, white pepper, and green cardamom, grilled in tandoor', price: 540, category: 'Tandoori Kebabs & Tikkas', dietary: 'non-veg', isBestseller: true },
        { id: `${restId}-3`, name: 'Paneer Angara Tikka', description: 'Spiced charcoal-smoked cottage cheese steaks with bell peppers and pickled onions', price: 460, category: 'Tandoori Kebabs & Tikkas', dietary: 'veg' },
        { id: `${restId}-4`, name: 'Dahi Ke Kebab', description: 'Crispy pan-seared hung yogurt patties infused with fresh coriander and crushed peppercorns', price: 420, category: 'Tandoori Kebabs & Tikkas', dietary: 'veg' },
        { id: `${restId}-5`, name: 'Bhatti Da Murgh', description: 'Bone-in spring chicken marinated in roasted Punjabi spices and mustard oil, charred crisp', price: 580, category: 'Tandoori Kebabs & Tikkas', dietary: 'non-veg' },
      ],
    },
    {
      name: 'Signature Dum Biryanis',
      description: 'Sealed with dough in earthen handis and slow-cooked over low charcoal embers',
      items: [
        { id: `${restId}-6`, name: 'Hyderabadi Gosht Dum Biryani', description: 'Tender baby lamb cuts layered with long-grain basmati rice, browned onions, saffron, and mint leaves', price: 690, category: 'Signature Dum Biryanis', dietary: 'non-veg', isChefSpecial: true, isBestseller: true, spiceLevel: 'Spicy' },
        { id: `${restId}-7`, name: 'Lucknowi Murgh Biryani', description: 'Fragrant mild Awadhi chicken biryani cooked in rich stock and aromatic kewra water', price: 590, category: 'Signature Dum Biryanis', dietary: 'non-veg', isBestseller: true, spiceLevel: 'Medium' },
        { id: `${restId}-8`, name: 'Subz Dum Handi Biryani', description: 'Seasonal vegetables, paneer cubes, and saffron rice cooked on dum, served with burani raita and salan', price: 450, category: 'Signature Dum Biryanis', dietary: 'veg' },
        { id: `${restId}-9`, name: 'Seeraga Samba Mutton Biryani', description: 'Short grain aromatic Tamil Nadu biryani with succulent bone-in meat, shallots, and ghee', price: 640, category: 'Signature Dum Biryanis', dietary: 'non-veg', spiceLevel: 'Spicy' },
      ],
    },
    {
      name: 'Rich Gravies & Curries',
      description: 'Simmered slow in heavy copper vessels',
      items: [
        { id: `${restId}-10`, name: 'Dal Bukhara (24 Hour Simmered)', description: 'Whole black lentils, sun-ripened tomatoes, garlic and churned butter slow-cooked overnight', price: 480, category: 'Rich Gravies & Curries', dietary: 'veg', isChefSpecial: true, isBestseller: true },
        { id: `${restId}-11`, name: 'Murgh Lababdar', description: 'Tandoori chicken pieces simmered in rich cashew and onion-tomato gravy with chopped bell peppers', price: 580, category: 'Rich Gravies & Curries', dietary: 'non-veg' },
        { id: `${restId}-12`, name: 'Paneer Makhani', description: 'Silky smooth tomato and cream gravy with soft cottage cheese cubes, finished with kasoori methi', price: 490, category: 'Rich Gravies & Curries', dietary: 'veg' },
        { id: `${restId}-13`, name: 'Nalli Nihari Curry', description: 'Slow-braised mutton shanks in rich spiced marrow gravy, topped with julienned ginger and lime', price: 720, category: 'Rich Gravies & Curries', dietary: 'non-veg', isChefSpecial: true },
      ],
    },
    {
      name: 'Tandoori Breads & Accompaniments',
      description: 'Hot from the tandoor to your table',
      items: [
        { id: `${restId}-14`, name: 'Butter Garlic Naan', description: 'Leavened bread topped with roasted garlic flakes, cilantro and melted butter', price: 140, category: 'Tandoori Breads & Accompaniments', dietary: 'veg' },
        { id: `${restId}-15`, name: 'Tandoori Roti with Desi Ghee', description: 'Crisp whole-wheat bread baked on tandoor wall, brushed with ghee', price: 90, category: 'Tandoori Breads & Accompaniments', dietary: 'veg' },
        { id: `${restId}-16`, name: 'Mirchi Ka Salan', description: 'Traditional Hyderabadi sesame, peanut, and green chilli curry accompaniment for biryani', price: 180, category: 'Tandoori Breads & Accompaniments', dietary: 'vegan' },
        { id: `${restId}-17`, name: 'Smoked Burani Raita', description: 'Chilled whipped yogurt seasoned with roasted garlic paste and roasted cumin powder', price: 140, category: 'Tandoori Breads & Accompaniments', dietary: 'veg' },
      ],
    },
    {
      name: 'Royal Desserts & Shakes',
      description: 'Decadent Mughlai sweets',
      items: [
        { id: `${restId}-18`, name: 'Shahi Tukda with Rabri', description: 'Golden fried bread triangles soaked in saffron syrup, coated with thick cardamom rabri and nuts', price: 290, category: 'Royal Desserts & Shakes', dietary: 'veg', isBestseller: true },
        { id: `${restId}-19`, name: 'Double Ka Meetha', description: 'Hyderabadi warm bread pudding with condensed milk, ghee, almonds, and silver foil', price: 280, category: 'Royal Desserts & Shakes', dietary: 'veg' },
        { id: `${restId}-20`, name: 'Matka Phirni', description: 'Chilled ground rice pudding cooked with full-cream milk and saffron, set in terracotta bowls', price: 240, category: 'Royal Desserts & Shakes', dietary: 'veg' },
        { id: `${restId}-21`, name: 'Royal Kesariya Lassi', description: 'Thick churned sweet yogurt topped with clotted malai, saffron syrup and crushed pistachios', price: 190, category: 'Royal Desserts & Shakes', dietary: 'veg' },
      ],
    },
  ],
});

// Curry & Claypot Diner Menu template (Chinese Wok, Hakka Noodles, Fried Rice + Claypot & Curry specialties)
const CURRY_CLAYPOT_MENU: (restId: string, restName: string) => RestaurantMenu = (restId, restName) => ({
  restaurantId: restId,
  restaurantName: restName,
  currency: '₹',
  lastUpdated: 'Updated Today • Wok-Tossed Chinese & Earthen Claypot Curries',
  categories: [
    {
      name: 'Chinese Wok & Starters',
      description: 'Hot sizzling Indo-Chinese appetizers tossed in signature oriental sauces',
      items: [
        {
          id: `${restId}-c1`,
          name: 'Veg Hakka Noodles',
          description: 'Classic wok-tossed noodles with crunchy julienned bell peppers, shredded cabbage, carrots, and spring onions in light soy',
          price: 220,
          category: 'Chinese Wok & Starters',
          dietary: 'veg',
          isBestseller: true,
        },
        {
          id: `${restId}-c2`,
          name: 'Chilli Paneer Dry',
          description: 'Crisp wok-tossed cottage cheese cubes with diced onions, crunchy bell peppers, green chillies, and savory dark soy glaze',
          price: 260,
          category: 'Chinese Wok & Starters',
          dietary: 'veg',
          isBestseller: true,
          spiceLevel: 'Spicy',
        },
        {
          id: `${restId}-c3`,
          name: 'Schezwan Fried Rice',
          description: 'Fragrant long-grain rice wok-tossed with fresh farm vegetables in house-made spicy Sichuan chilli paste and garlic',
          price: 240,
          category: 'Chinese Wok & Starters',
          dietary: 'veg',
          isChefSpecial: true,
          spiceLevel: 'Spicy',
        },
        {
          id: `${restId}-c4`,
          name: 'Chicken Manchurian',
          description: 'Golden fried chicken dumplings tossed in rich garlic, coriander, ginger, and dark soya Manchurian gravy',
          price: 290,
          category: 'Chinese Wok & Starters',
          dietary: 'non-veg',
          isBestseller: true,
        },
        {
          id: `${restId}-c5`,
          name: 'Chilli Chicken',
          description: 'Tender chicken morsels wok-seared with bell peppers, green chillies, scallions, and zesty soya reduction',
          price: 310,
          category: 'Chinese Wok & Starters',
          dietary: 'non-veg',
          spiceLevel: 'Spicy',
        },
        {
          id: `${restId}-c6`,
          name: 'Crispy Chilli Babycorn',
          description: 'Golden fried tender babycorn fingers tossed with spicy aromatics, crushed garlic, and spring onions',
          price: 220,
          category: 'Chinese Wok & Starters',
          dietary: 'veg',
        },
        {
          id: `${restId}-c7`,
          name: 'Veg Spring Rolls',
          description: 'Crispy golden rolls stuffed with seasoned shredded vegetables, served with house sweet chilli dip',
          price: 210,
          category: 'Chinese Wok & Starters',
          dietary: 'veg',
        },
      ],
    },
    {
      name: 'Chinese Mains & Noodles',
      description: 'Generous wok dishes served with savoury gravies and stir-fries',
      items: [
        {
          id: `${restId}-c8`,
          name: 'Chicken Hakka Noodles',
          description: 'Wok-seared noodles with succulent chicken shreds, egg, and fresh vegetables tossed in sesame and white pepper',
          price: 270,
          category: 'Chinese Mains & Noodles',
          dietary: 'non-veg',
          isBestseller: true,
        },
        {
          id: `${restId}-c9`,
          name: 'Veg Manchurian Gravy',
          description: 'Minced vegetable dumplings simmered in savory garlic, coriander, and scallion soya gravy',
          price: 240,
          category: 'Chinese Mains & Noodles',
          dietary: 'veg',
        },
        {
          id: `${restId}-c10`,
          name: 'Egg Schezwan Fried Rice',
          description: 'Wok-tossed rice with fluffy scrambled eggs, spring onions, and zesty Schezwan chilli pepper',
          price: 250,
          category: 'Chinese Mains & Noodles',
          dietary: 'non-veg',
          spiceLevel: 'Spicy',
        },
      ],
    },
    {
      name: 'Claypot Specialties & Biryani',
      description: 'Slow-simmered in seasoned earthen clay pots to retain moisture and earth-fired aroma',
      items: [
        {
          id: `${restId}-cp1`,
          name: 'Claypot Chicken Biryani',
          description: 'Slow-cooked fragrant basmati rice and marinated chicken cooked on dum in an individual earthenware pot',
          price: 340,
          category: 'Claypot Specialties & Biryani',
          dietary: 'non-veg',
          isChefSpecial: true,
          isBestseller: true,
        },
        {
          id: `${restId}-cp2`,
          name: 'Kerala Claypot Fish Curry',
          description: 'Fresh seer fish steaks simmered in tangy kokum, coconut milk, and curry leaf gravy in an unglazed earthen vessel',
          price: 380,
          category: 'Claypot Specialties & Biryani',
          dietary: 'non-veg',
          isChefSpecial: true,
        },
        {
          id: `${restId}-cp3`,
          name: 'Claypot Paneer Makhani',
          description: 'Rich cottage cheese simmered in buttery tomato and cashew gravy inside a traditional clay handi',
          price: 280,
          category: 'Claypot Specialties & Biryani',
          dietary: 'veg',
        },
        {
          id: `${restId}-cp4`,
          name: 'Claypot Dal Tadka',
          description: 'Yellow arhar lentils tempered with cumin, roasted garlic, and ghee in an earthen pot',
          price: 210,
          category: 'Claypot Specialties & Biryani',
          dietary: 'veg',
        },
      ],
    },
    {
      name: 'Breads & Desserts',
      description: 'Fresh tandoor breads and comforting desserts',
      items: [
        {
          id: `${restId}-b1`,
          name: 'Butter Garlic Naan',
          description: 'Crisp leavened bread brushed with roasted garlic butter and cilantro',
          price: 90,
          category: 'Breads & Desserts',
          dietary: 'veg',
        },
        {
          id: `${restId}-b2`,
          name: 'Kerala Malabar Parotta',
          description: 'Flaky layered flatbread cooked with desi ghee on tawa',
          price: 70,
          category: 'Breads & Desserts',
          dietary: 'veg',
        },
        {
          id: `${restId}-b3`,
          name: 'Hot Gulab Jamun with Ice Cream',
          description: 'Soft milk dumplings soaked in cardamom rose syrup served warm with vanilla ice cream',
          price: 160,
          category: 'Breads & Desserts',
          dietary: 'veg',
        },
      ],
    },
  ],
});

// Generic Cafe / Bakery / Continental menu template
const CAFE_CONTINENTAL_MENU: (restId: string, restName: string) => RestaurantMenu = (restId, restName) => ({
  restaurantId: restId,
  restaurantName: restName,
  currency: '₹',
  lastUpdated: 'Updated Today • Micro-lot Roasted Beans & Sourdough Bakes',
  categories: [
    {
      name: 'All-Day Breakfast & Toasties',
      description: 'Artisanal bakes on sourdough and brioche',
      items: [
        { id: `${restId}-1`, name: 'Hass Avocado & Poached Egg Brioche', description: 'Smashed Haas avocado, citrus feta, toasted seeds, microgreens on warm buttered brioche', price: 440, category: 'All-Day Breakfast & Toasties', dietary: 'non-veg', isBestseller: true },
        { id: `${restId}-2`, name: 'Wild Truffle Mushroom Toast', description: 'Sautéed portobello and button mushrooms, garlic confit butter, parmesan shavings on country sourdough', price: 420, category: 'All-Day Breakfast & Toasties', dietary: 'veg', isChefSpecial: true },
        { id: `${restId}-3`, name: 'Smoked Chicken & Cheddar Panini', description: 'Herb-roasted chicken breast, aged English cheddar, caramelized onions, honey mustard dressing', price: 460, category: 'All-Day Breakfast & Toasties', dietary: 'non-veg' },
        { id: `${restId}-4`, name: 'Classic French Almond Croissant', description: 'Double-baked flaky butter croissant filled with almond frangipane cream and sliced almonds', price: 280, category: 'All-Day Breakfast & Toasties', dietary: 'veg', isBestseller: true },
        { id: `${restId}-5`, name: 'Açai Smoothie Bowl with Granola', description: 'Blended organic açai, banana, and berries topped with toasted house granola, chia seeds, fresh dragonfruit', price: 410, category: 'All-Day Breakfast & Toasties', dietary: 'vegan' },
      ],
    },
    {
      name: 'Gourmet Bowls & Pastas',
      description: 'Nourishing mains crafted with local farm produce',
      items: [
        { id: `${restId}-6`, name: 'Pan-Roasted Herb Chicken Breast', description: 'Sous-vide chicken breast with roasted garlic potato mash, buttered seasonal greens, red wine jus', price: 590, category: 'Gourmet Bowls & Pastas', dietary: 'non-veg', isChefSpecial: true },
        { id: `${restId}-7`, name: 'Truffle Mac & Aged Cheese Bake', description: 'Cavatappi pasta baked with three-cheese mornay sauce, black truffle oil, herbed panko crust', price: 520, category: 'Gourmet Bowls & Pastas', dietary: 'veg' },
        { id: `${restId}-8`, name: 'Falafel & Hummus Mezze Bowl', description: 'Crisp herbed chickpea falafels, smoked paprika hummus, pickled beetroot, tabbouleh, warm pita', price: 450, category: 'Gourmet Bowls & Pastas', dietary: 'vegan' },
        { id: `${restId}-9`, name: 'Sundried Tomato & Basil Gnocchi', description: 'Handmade potato gnocchi tossed in blistered cherry tomato sauce with stracciatella cheese', price: 540, category: 'Gourmet Bowls & Pastas', dietary: 'veg' },
      ],
    },
    {
      name: 'Artisan Coffee & Specialty Brews',
      description: 'Single-origin Karnataka estate beans roasted in small batches',
      items: [
        { id: `${restId}-10`, name: 'Chikmagalur Slow Cold Brew', description: '18-hour cold steeped single-estate Arabica served over clear block ice', price: 240, category: 'Artisan Coffee & Specialty Brews', dietary: 'vegan', isBestseller: true },
        { id: `${restId}-11`, name: 'V60 Pour-Over (Washed Estate)', description: 'Handcrafted pour-over highlighting bright floral notes of peach and jasmine', price: 260, category: 'Artisan Coffee & Specialty Brews', dietary: 'vegan', isChefSpecial: true },
        { id: `${restId}-12`, name: 'Spanish Iced Latte with Condensed Milk', description: 'Double shot espresso shaken with chilled organic milk and sweet condensed milk', price: 270, category: 'Artisan Coffee & Specialty Brews', dietary: 'veg' },
        { id: `${restId}-13`, name: 'Matcha Green Tea Latte', description: 'Ceremonial grade Uji Japanese matcha whisked with steamed oat milk', price: 290, category: 'Artisan Coffee & Specialty Brews', dietary: 'vegan' },
        { id: `${restId}-14`, name: 'Classic Flat White', description: 'Velvety micro-foamed milk folded gently into double ristretto shot', price: 220, category: 'Artisan Coffee & Specialty Brews', dietary: 'veg' },
      ],
    },
    {
      name: 'Pastries & Bakes',
      description: 'Baked fresh every morning in our patisserie kitchen',
      items: [
        { id: `${restId}-15`, name: 'Burnt Basque Cheesecake', description: 'Caramelized crust with velvety molten cheese centre, served with blueberry compote', price: 360, category: 'Pastries & Bakes', dietary: 'veg', isBestseller: true },
        { id: `${restId}-16`, name: 'Belgian Dark Chocolate Sea Salt Brownie', description: 'Warm fudgy 70% dark chocolate brownie sprinkled with Maldon sea salt flakes', price: 260, category: 'Pastries & Bakes', dietary: 'veg' },
        { id: `${restId}-17`, name: 'Tiramisu Parfait Glass', description: 'Mascarpone mousse, espresso sponge, Valrhona dark cocoa dusting', price: 340, category: 'Pastries & Bakes', dietary: 'veg' },
      ],
    },
  ],
});

// Semantic image resolver ensuring accurate dish visual matching
export function getAccurateDishImage(item: { name: string; category?: string; dietary?: string }): string {
  const name = item.name.toLowerCase();
  const cat = (item.category || '').toLowerCase();

  // 1. Butter Chicken / Murgh Makhani / Chicken in creamy tomato gravy
  if (
    name.includes('butter chicken') ||
    name.includes('chicken makhani') ||
    name.includes('murgh makhani') ||
    (name.includes('butter') && name.includes('chicken'))
  ) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Butter_Chicken_%26_Butter_Naan_-_Home_-_Chandigarh_-_India_-_0006.jpg/960px-Butter_Chicken_%26_Butter_Naan_-_Home_-_Chandigarh_-_India_-_0006.jpg';
  }

  // 2. Paneer dishes (Paneer Tikka, Paneer Butter Masala, Paneer Makhani, Paneer Angara, Paneer Ghee Roast)
  if (name.includes('paneer')) {
    if (name.includes('makhani') || name.includes('butter masala') || name.includes('lababdar') || name.includes('gravy')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Paneer_Butter_Masala.JPG/960px-Paneer_Butter_Masala.JPG';
    }
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Paneer_tikka.jpg/960px-Paneer_tikka.jpg';
  }

  // 3. Biryani (Dum Biryani, Awadhi, Hyderabadi, Mutton Biryani, Chicken Biryani)
  if (name.includes('biryani')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/%22Hyderabadi_Dum_Biryani%22.jpg/960px-%22Hyderabadi_Dum_Biryani%22.jpg';
  }

  // 4. Dosa
  if (name.includes('dosa')) {
    if (name.includes('neer')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Neer-dosa.jpg/960px-Neer-dosa.jpg';
    }
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Masala_Dosa_2023.jpg/960px-Masala_Dosa_2023.jpg';
  }

  // 5. Idli
  if (name.includes('idli')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/1/11/Idli_Sambar.JPG';
  }

  // 6. Naan, Kulcha, Roti, Paratha
  if (name.includes('naan') || name.includes('kulcha')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Annapurna_Naan.jpg/960px-Annapurna_Naan.jpg';
  }
  if (name.includes('malabar parotta') || name.includes('parotta')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Malabar_Parotta.jpg/960px-Malabar_Parotta.jpg';
  }
  if ((name.includes('paratha') || name.includes('roti')) && !name.includes('akki') && !name.includes('kori')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Triangle_paratha_%28cropped%29.JPG/960px-Triangle_paratha_%28cropped%29.JPG';
  }

  // 7. Tandoori Chicken & Charred Poultry
  if (name.includes('tandoori chicken') || name.includes('bhatti da murgh') || (name.includes('tandoori') && name.includes('chicken'))) {
    return 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Chickentandoori.jpg';
  }

  // 8. Dal Makhani / Dal Bukhara / Lentils
  if (name.includes('dal') || name.includes('lentil') || name.includes('bukhara')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Punjabi_style_Dal_Makhani.jpg/960px-Punjabi_style_Dal_Makhani.jpg';
  }

  // 9. Gulab Jamun & Indian Sweets
  if (name.includes('gulab jamun') || (name.includes('jamun') && (cat.includes('dessert') || cat.includes('sweet')))) {
    return 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Gulab-jamun-wallpaper-1.jpg';
  }

  // 10. Pizza
  if (name.includes('pizza') || cat.includes('pizza')) {
    if (name.includes('margherita')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Pizza_Margherita_stu_spivack.jpg/960px-Pizza_Margherita_stu_spivack.jpg';
    }
    if (name.includes('pepperoni') || name.includes('diavola')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Pepperoni_Pizza_%2829204589095%29.jpg/960px-Pepperoni_Pizza_%2829204589095%29.jpg';
    }
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80';
  }

  // 11. Pasta & Risotto
  if (name.includes('ravioli')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Flickr_-_cyclonebill_-_Ravioli_med_skinke_og_asparges_i_mascarponecreme.jpg/960px-Flickr_-_cyclonebill_-_Ravioli_med_skinke_og_asparges_i_mascarponecreme.jpg';
  }
  if (name.includes('tagliatelle') || name.includes('bolognese')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/6/67/Nests_of_tagliatelle_bolognesi.jpg';
  }
  if (name.includes('risotto')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Risotto_with_speck_and_goat_cheese_%286101067436%29.jpg/960px-Risotto_with_speck_and_goat_cheese_%286101067436%29.jpg';
  }
  if (name.includes('aglio olio') || name.includes('spaghetti')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Aglio_e_olio.jpg/960px-Aglio_e_olio.jpg';
  }
  if (name.includes('mac & cheese') || name.includes('mac and cheese')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Original_Mac_n_Cheese_.jpg/960px-Original_Mac_n_Cheese_.jpg';
  }
  if (name.includes('gnocchi')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/8/86/Gnocchi_di_ricotta_burro_e_salvia.jpg';
  }
  if (name.includes('pasta') || name.includes('fettuccine') || cat.includes('pasta')) {
    return 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80';
  }

  // Chinese & Indo-Chinese Specialties (Noodles, Fried Rice, Manchurian, Chilli Paneer, Spring Rolls)
  if (name.includes('noodle') || name.includes('hakka') || name.includes('chow mein')) {
    return 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('schezwan') || name.includes('fried rice') || (name.includes('rice') && cat.includes('chinese'))) {
    return 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('manchurian')) {
    return 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('spring roll')) {
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('chilli babycorn') || name.includes('babycorn')) {
    return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
  }

  // 12. Burger
  if (name.includes('burger')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80';
  }

  // Chicken specialties
  if (name.includes('malai tikka')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Chicken_malai_tikka.jpg/960px-Chicken_malai_tikka.jpg';
  }
  if (name.includes('ghee roast') && (name.includes('chicken') || item.dietary === 'non-veg')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Chicken_ghee_roast_on_a_plate.jpg/960px-Chicken_ghee_roast_on_a_plate.jpg';
  }
  if (name.includes('kori rotti')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Kori_rotti%28with_chicken_ghasi%29.jpg/960px-Kori_rotti%28with_chicken_ghasi%29.jpg';
  }
  if (name.includes('chicken') || name.includes('pollo') || name.includes('murgh')) {
    return 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80';
  }

  // Lamb / Mutton / Nihari / Chops / Kebabs
  if (name.includes('nihari') || name.includes('shank')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Nalli_Nihari_India.jpg/960px-Nalli_Nihari_India.jpg';
  }
  if (name.includes('chop') || name.includes('sigri')) {
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('kebab') || name.includes('galouti') || name.includes('shami') || name.includes('seekh')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Shami_kabab.JPG/960px-Shami_kabab.JPG';
  }
  if (name.includes('lamb') || name.includes('mutton') || name.includes('gosht') || name.includes('pandi') || name.includes('prosciutto')) {
    return 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80';
  }

  // Seafood (Fish, Prawn, Calamari, Salmon, Crab)
  if (name.includes('calamari') || name.includes('squid')) {
    return 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('rawa fry') || name.includes('fish fry') || name.includes('anjal')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Fish_fry_indian.jpg/960px-Fish_fry_indian.jpg';
  }
  if (name.includes('fish') || name.includes('prawn') || name.includes('rawas') || name.includes('gamberi') || name.includes('gassi')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/South_Indian_Fish_Curry.jpg/960px-South_Indian_Fish_Curry.jpg';
  }

  // Breads & Toast
  if (name.includes('appam')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Appam_with_egg_curry.jpg/960px-Appam_with_egg_curry.jpg';
  }
  if (name.includes('akki rotti')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Akki_rotti.jpg/960px-Akki_rotti.jpg';
  }
  if (name.includes('croissant')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Croissant-Petr_Kratochvil.jpg/960px-Croissant-Petr_Kratochvil.jpg';
  }
  if (name.includes('panini') || name.includes('toast') || name.includes('sandwich') || name.includes('brioche')) {
    if (name.includes('avocado')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Avocado_toast_at_Voyager_Espresso_%2833134505776%29.jpg/960px-Avocado_toast_at_Voyager_Espresso_%2833134505776%29.jpg';
    }
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Panino.jpg/960px-Panino.jpg';
  }
  if (name.includes('bruschetta')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/2014_Bruschetta_The_Larder_Chiang_Mai.jpg/960px-2014_Bruschetta_The_Larder_Chiang_Mai.jpg';
  }

  // Rice dishes (Pulao, Basmati, Ghee Rice, Curd Rice, Bisi Bele Bath)
  if (name.includes('curd rice')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Curd_Rice.jpg/960px-Curd_Rice.jpg';
  }
  if (name.includes('bisi bele bath')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Bisi_Bele_Bath.jpg/960px-Bisi_Bele_Bath.jpg';
  }
  if (name.includes('pulao')) {
    return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('rice') || cat.includes('rice')) {
    return 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=600&q=80';
  }

  // Desserts
  if (name.includes('tiramisu')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Tiramisu_-_Raffaele_Diomede.jpg/960px-Tiramisu_-_Raffaele_Diomede.jpg';
  }
  if (name.includes('rasgulla')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Rasgulla.jpg/960px-Rasgulla.jpg';
  }
  if (name.includes('kulfi')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Matka_kulfi.jpg';
  }
  if (name.includes('mysore pak')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Mysore_pak.jpg/960px-Mysore_pak.jpg';
  }
  if (name.includes('shahi tukda')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Shahi_Tukra.jpg/960px-Shahi_Tukra.jpg';
  }
  if (name.includes('double ka meetha')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Double_Ka_Meetha.jpg/960px-Double_Ka_Meetha.jpg';
  }
  if (name.includes('phirni')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Phirni_in_clay_cup.jpg/960px-Phirni_in_clay_cup.jpg';
  }
  if (name.includes('cannoli')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Cannoli_siciliani_al_Caff%C3%A8_Impero%2C_ad_Alcamo.jpg/960px-Cannoli_siciliani_al_Caff%C3%A8_Impero%2C_ad_Alcamo.jpg';
  }
  if (name.includes('panna cotta')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Panna_Cotta_with_cream_and_garnish.jpg/960px-Panna_Cotta_with_cream_and_garnish.jpg';
  }
  if (name.includes('cheesecake')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Baked_cheesecake_with_raspberries_and_blueberries.jpg/960px-Baked_cheesecake_with_raspberries_and_blueberries.jpg';
  }
  if (name.includes('payasam')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Payasam_-_South_India.jpg/960px-Payasam_-_South_India.jpg';
  }
  if (name.includes('chocolate') || name.includes('cake') || name.includes('fondant') || name.includes('brownie')) {
    return 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80';
  }

  // Beverages & Coffee
  if (name.includes('filter kaapi') || name.includes('kaapi')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Filter_Coffee_Davarah_Tumbler.jpg/960px-Filter_Coffee_Davarah_Tumbler.jpg';
  }
  if (name.includes('cold brew')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Preparation_of_cold_brew_coffee_06.jpg/960px-Preparation_of_cold_brew_coffee_06.jpg';
  }
  if (name.includes('latte')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Caffe_Latte_at_Pulse_Cafe.jpg/960px-Caffe_Latte_at_Pulse_Cafe.jpg';
  }
  if (name.includes('flat white')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Flat_white_coffee_with_pretty_feather_pattern.jpg/960px-Flat_white_coffee_with_pretty_feather_pattern.jpg';
  }
  if (name.includes('espresso') || name.includes('ristretto')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tazzina_di_caff%C3%A8_a_Ventimiglia.jpg/960px-Tazzina_di_caff%C3%A8_a_Ventimiglia.jpg';
  }
  if (name.includes('lassi') || name.includes('majige') || name.includes('buttermilk')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Salt_lassi.jpg/960px-Salt_lassi.jpg';
  }
  if (name.includes('aam panna')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Keri_Ka_Sharbat.JPG/960px-Keri_Ka_Sharbat.JPG';
  }

  // Vegetarian / Veg starters & sides
  if (name.includes('burrata')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Burrata2.jpg/960px-Burrata2.jpg';
  }
  if (name.includes('arancini')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Arancini_002.jpg/960px-Arancini_002.jpg';
  }
  if (name.includes('falafel') || name.includes('hummus')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Falafels_2.jpg/960px-Falafels_2.jpg';
  }
  if (name.includes('stew')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Vegetable_Stew_Kerala_Style.jpg/960px-Vegetable_Stew_Kerala_Style.jpg';
  }
  if (name.includes('raita')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Boondi_raita.jpg/960px-Boondi_raita.jpg';
  }
  if (name.includes('salan')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Mirchi_ka_salan.jpg/960px-Mirchi_ka_salan.jpg';
  }
  if (name.includes('salad') || name.includes('greens') || name.includes('broccoli')) {
    return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('lotus') || name.includes('corn') || name.includes('fry') || cat.includes('starter')) {
    return 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80';
  }

  // Category fallbacks
  if (cat.includes('bread') || cat.includes('roti') || cat.includes('naan')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Annapurna_Naan.jpg/960px-Annapurna_Naan.jpg';
  }
  if (cat.includes('dessert') || cat.includes('sweet') || cat.includes('dolci')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Tiramisu_-_Raffaele_Diomede.jpg/960px-Tiramisu_-_Raffaele_Diomede.jpg';
  }
  if (cat.includes('beverage') || cat.includes('drink') || cat.includes('brew')) {
    return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80';
  }

  return item.dietary === 'non-veg'
    ? 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80'
    : 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80';
}

// Dedicated fallback image provider matching exact dish semantics
export function getDishFallbackImage(
  itemOrCategory: string | { name: string; category?: string; dietary?: string },
  dishName?: string
): string {
  let name = '';
  let cat = '';
  let dietary = '';

  if (typeof itemOrCategory === 'object' && itemOrCategory !== null) {
    name = (itemOrCategory.name || '').toLowerCase();
    cat = (itemOrCategory.category || '').toLowerCase();
    dietary = (itemOrCategory.dietary || '').toLowerCase();
  } else {
    cat = (typeof itemOrCategory === 'string' ? itemOrCategory : '').toLowerCase();
    name = (dishName || '').toLowerCase();
  }

  // Butter chicken -> authentic butter chicken
  if (
    name.includes('butter chicken') ||
    name.includes('chicken makhani') ||
    name.includes('murgh makhani') ||
    (name.includes('butter') && name.includes('chicken'))
  ) {
    return 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80';
  }

  // Paneer -> grilled paneer tikka / cubes
  if (name.includes('paneer')) {
    return 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80';
  }

  // Biryani -> biryani
  if (name.includes('biryani')) {
    return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80';
  }

  // Dosa -> dosa
  if (name.includes('dosa')) {
    return 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80';
  }

  // Idli -> idli
  if (name.includes('idli')) {
    return 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80';
  }

  // Naan, Paratha, Roti
  if (name.includes('naan') || name.includes('kulcha') || name.includes('roti') || name.includes('paratha') || name.includes('parotta')) {
    return 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80';
  }

  // Tandoori chicken
  if (name.includes('tandoori chicken') || name.includes('bhatti da murgh') || (name.includes('tandoori') && name.includes('chicken'))) {
    return 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80';
  }

  // Dal makhani
  if (name.includes('dal') || name.includes('lentil') || name.includes('bukhara')) {
    return 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80';
  }

  // Gulab jamun
  if (name.includes('gulab jamun') || name.includes('jamun')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Gulab-jamun-wallpaper-1.jpg';
  }

  // Pizza
  if (name.includes('pizza') || cat.includes('pizza')) {
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80';
  }

  // Pasta
  if (name.includes('pasta') || name.includes('ravioli') || name.includes('spaghetti') || name.includes('tagliatelle') || name.includes('fettuccine') || name.includes('mac') || name.includes('gnocchi') || cat.includes('pasta')) {
    return 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80';
  }

  // Burger
  if (name.includes('burger')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80';
  }

  // Chicken general
  if (name.includes('chicken') || name.includes('pollo') || name.includes('murgh')) {
    return 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80';
  }

  // Meat general
  if (dietary === 'non-veg') {
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80';
  }

  // Veg general
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
}

function enrichMenuItem(item: MenuItem, _index: number): MenuItem {
  const name = item.name.toLowerCase();

  // Enforce accurate dish image matching so each dish visually represents the dish name
  const imageUrl = getAccurateDishImage(item);

  const hasEgg = item.hasEgg ?? (name.includes('egg') || name.includes('tiramisu') || name.includes('carbonara') || name.includes('brioche') || name.includes('fondant'));
  const containsNuts = item.containsNuts ?? (name.includes('nut') || name.includes('almond') || name.includes('pistachio') || name.includes('cashew') || name.includes('pesto') || name.includes('kulfi') || name.includes('rabri') || name.includes('makhani') || name.includes('lababdar'));
  const isGlutenFree = item.isGlutenFree ?? (item.dietary === 'vegan' || name.includes('rice') || name.includes('dosa') || name.includes('curry') || name.includes('nihari') || name.includes('dal') || name.includes('salmon') || name.includes('chicken') || name.includes('coffee') || name.includes('soda') || name.includes('shrub') || name.includes('water'));
  const isJain = item.isJain ?? (item.dietary === 'veg' && (name.includes('dal') || name.includes('paneer') || name.includes('curd') || name.includes('rice') || name.includes('kulfi') || name.includes('panna') || name.includes('shrub')));

  const dietaryTags = item.dietaryTags || [
    item.dietary === 'veg' ? 'Vegetarian' : item.dietary === 'vegan' ? 'Vegan' : 'Non-Veg',
    ...(isGlutenFree ? ['Gluten-Free'] : []),
    ...(isJain ? ['Jain Option'] : []),
    ...(hasEgg ? ['Contains Egg'] : []),
    ...(containsNuts ? ['Contains Nuts'] : []),
    ...(item.isChefSpecial ? ['Chef Special'] : []),
    ...(item.isBestseller ? ['Bestseller'] : []),
  ];

  return {
    ...item,
    imageUrl,
    hasEgg,
    containsNuts,
    isGlutenFree,
    isJain,
    dietaryTags,
  };
}

/**
 * Returns the complete digital menu for any restaurant by its ID or cuisine type.
 */
export function getRestaurantMenu(restaurantId: string, restaurantName?: string, cuisines?: string[]): RestaurantMenu {
  let menu: RestaurantMenu;
  const name = restaurantName || 'Restaurant';
  const cuisineStr = (cuisines || []).join(' ').toLowerCase();

  if (restaurantId === 'rest-1' || restaurantId === 'the-ember-room' || name.toLowerCase().includes('ember')) {
    menu = EMBER_ROOM_MENU;
  } else if (
    restaurantId === 'rest-9' ||
    restaurantId.includes('claypot') ||
    name.toLowerCase().includes('claypot') ||
    name.toLowerCase().includes('curry & claypot')
  ) {
    menu = CURRY_CLAYPOT_MENU(restaurantId, name);
  } else if (cuisineStr.includes('italian')) {
    menu = ITALIAN_MENU_TEMPLATE(restaurantId, name);
  } else if (cuisineStr.includes('south indian') || cuisineStr.includes('coastal')) {
    menu = SOUTH_INDIAN_COASTAL_MENU(restaurantId, name);
  } else if (cuisineStr.includes('biryani') || cuisineStr.includes('mughlai') || cuisineStr.includes('north indian')) {
    menu = MUGHLAI_BIRYANI_MENU(restaurantId, name);
  } else if (cuisineStr.includes('cafe') || cuisineStr.includes('bakery') || cuisineStr.includes('continental')) {
    menu = CAFE_CONTINENTAL_MENU(restaurantId, name);
  } else {
    menu = {
      ...EMBER_ROOM_MENU,
      restaurantId,
      restaurantName: name,
    };
  }

  return {
    ...menu,
    categories: menu.categories.map((cat) => ({
      ...cat,
      items: cat.items.map((item, idx) => enrichMenuItem(item, idx)),
    })),
  };
}

/**
 * Generates a realistic conceptual post-dining bill for a reservation.
 * Includes itemized dishes from that restaurant's actual menu, GST, and deducts the refundable deposit!
 */
export function generateDiningBill(reservation: Reservation): DiningBill {
  const menu = getRestaurantMenu(reservation.restaurantId, reservation.restaurantName);
  
  // Pick 3-4 realistic items from the menu
  const allItems: MenuItem[] = [];
  menu.categories.forEach((c) => allItems.push(...c.items));

  const selectedItems: MenuItem[] = [];
  if (allItems.length > 0) {
    // Pick 1 starter
    const starters = allItems.filter((i) => i.category.toLowerCase().includes('starter') || i.category.toLowerCase().includes('small'));
    if (starters.length > 0) selectedItems.push(starters[0]);
    // Pick 2 mains
    const mains = allItems.filter((i) => i.category.toLowerCase().includes('main') || i.category.toLowerCase().includes('curry') || i.category.toLowerCase().includes('pizza') || i.category.toLowerCase().includes('biryani'));
    if (mains.length > 0) selectedItems.push(mains[0]);
    if (mains.length > 1) selectedItems.push(mains[1]);
    // Pick 1 dessert or beverage
    const desserts = allItems.filter((i) => i.category.toLowerCase().includes('dessert') || i.category.toLowerCase().includes('dolci') || i.category.toLowerCase().includes('sweet'));
    if (desserts.length > 0) selectedItems.push(desserts[0]);
    const bevs = allItems.filter((i) => i.category.toLowerCase().includes('beverage') || i.category.toLowerCase().includes('drink') || i.category.toLowerCase().includes('brew'));
    if (bevs.length > 0) selectedItems.push(bevs[0]);
  }

  // If diner has a real persistent food order attached, use exact ordered items
  if (reservation.foodOrder && reservation.foodOrder.items && reservation.foodOrder.items.length > 0) {
    const foodBillItems: BillItem[] = reservation.foodOrder.items.map((it, idx) => {
      const rawPrice = it.unitPrice ?? it.price ?? 0;
      const price = typeof rawPrice === 'number' && !isNaN(rawPrice)
        ? rawPrice
        : (Number(String(rawPrice).replace(/[^0-9.]/g, '')) || 0);
      const qty = Math.max(1, Number(it.quantity) || 1);
      const lineTotal = typeof it.total === 'number' && !isNaN(it.total) && it.total > 0
        ? it.total
        : price * qty;

      return {
        id: it.itemId || `fo-item-${idx + 1}`,
        name: it.name,
        quantity: qty,
        unitPrice: price,
        totalPrice: lineTotal,
        dietary: it.dietary,
        intendedFor: it.intendedFor,
        dietaryTag: it.dietaryTag,
        allergenTags: it.allergenTags,
        severity: it.severity,
        kitchenNotes: it.kitchenNotes,
      };
    });
    const subtotal = foodBillItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const gstAmount = Math.round(subtotal * 0.05);
    const serviceCharge = Math.round(subtotal * 0.05);
    const grossTotal = subtotal + gstAmount + serviceCharge;
    const depositAdjusted = typeof reservation.depositAmount === 'number' ? reservation.depositAmount : 0;
    const netPayable = Math.max(0, grossTotal - depositAdjusted);

    return {
      billNumber: `BILL-${reservation.bookingRef.replace('FT-', '')}-26`,
      reservationId: reservation.id,
      restaurantId: reservation.restaurantId,
      restaurantName: reservation.restaurantName,
      tableNumber: reservation.tableNumber,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      date: reservation.date,
      timeSlot: reservation.timeSlot,
      items: foodBillItems,
      subtotal,
      gstAmount,
      serviceCharge,
      grossTotal,
      depositAdjusted,
      netPayable,
      paymentStatus: reservation.status === 'completed' ? 'settled' : 'pending',
      settledVia: reservation.paymentMethod || 'UPI (Google Pay)',
      generatedAt: `${reservation.date} ${reservation.timeSlot}`,
      digitalBillSmsSentTo: reservation.customerPhone,
    };
  }

  const billItems: BillItem[] = selectedItems.slice(0, 4).map((item, idx) => ({
    id: `item-${idx + 1}`,
    name: item.name,
    quantity: idx === 1 ? Math.max(1, Math.min(2, reservation.guests)) : 1,
    unitPrice: item.price,
    totalPrice: item.price * (idx === 1 ? Math.max(1, Math.min(2, reservation.guests)) : 1),
    dietary: item.dietary,
  }));

  const subtotal = billItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const gstAmount = Math.round(subtotal * 0.05); // 5% GST
  const serviceCharge = Math.round(subtotal * 0.05); // 5% Service charge
  const grossTotal = subtotal + gstAmount + serviceCharge;
  const depositAdjusted = typeof reservation.depositAmount === 'number' ? reservation.depositAmount : 0;
  const netPayable = Math.max(0, grossTotal - depositAdjusted);

  return {
    billNumber: `BILL-${reservation.bookingRef.replace('FT-', '')}-26`,
    reservationId: reservation.id,
    restaurantId: reservation.restaurantId,
    restaurantName: reservation.restaurantName,
    tableNumber: reservation.tableNumber,
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone,
    date: reservation.date,
    timeSlot: reservation.timeSlot,
    items: billItems,
    subtotal,
    gstAmount,
    serviceCharge,
    grossTotal,
    depositAdjusted,
    netPayable,
    paymentStatus: reservation.status === 'completed' ? 'settled' : 'pending',
    settledVia: reservation.paymentMethod || 'UPI (Google Pay)',
    generatedAt: `${reservation.date} ${reservation.timeSlot}`,
    digitalBillSmsSentTo: reservation.customerPhone,
  };
}
