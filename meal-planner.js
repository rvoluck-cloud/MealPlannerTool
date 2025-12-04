// Meal Planner JavaScript
// Version 3.2 - Ingredient Consolidation & Quantity Aggregation

// Google Sheets CSV export URL
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1oWS7CQUtyxvZheGa0HckhGGPt9_gxELDGdCL8-DtKbM/export?format=csv";

// Ingredient categories for grocery list organization
const CATEGORIES = {
    'dairy': {
        name: 'Dairy',
        icon: '📦',
        keywords: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream', 'parmesan', 
                  'mozzarella', 'cheddar', 'feta', 'ricotta', 'cottage cheese']
    },
    'fruit': {
        name: 'Fruit',
        icon: '🍎',
        keywords: ['apple', 'banana', 'orange', 'lemon', 'lime', 'berry', 'berries', 'strawberry', 
                  'blueberry', 'grape', 'melon', 'pear', 'peach', 'mango', 'pineapple', 'avocado']
    },
    'vegetables': {
        name: 'Vegetables',
        icon: '🥕',
        keywords: ['lettuce', 'tomato', 'onion', 'garlic', 'pepper', 'carrot', 'celery', 
                   'cucumber', 'broccoli', 'cauliflower', 'spinach', 'kale', 'cabbage', 
                   'zucchini', 'squash', 'potato', 'sweet potato', 'corn', 'peas', 
                   'green beans', 'asparagus', 'mushroom', 'eggplant', 'radish']
    },
    'herbs': {
        name: 'Herbs & Spices',
        icon: '🌿',
        keywords: ['basil', 'parsley', 'cilantro', 'thyme', 'rosemary', 'oregano', 'dill', 
                  'mint', 'sage', 'chives', 'bay leaf']
    },
    'proteins': {
        name: 'Proteins',
        icon: '🍗',
        keywords: ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 
                   'lamb', 'bacon', 'sausage', 'ham', 'egg', 'tofu', 'beans', 'lentils', 
                   'chickpeas', 'ground beef', 'ground turkey', 'steak', 'breast']
    },
    'frozen': {
        name: 'Frozen',
        icon: '❄️',
        keywords: ['frozen', 'ice cream', 'popsicle']
    },
    'pantry': {
        name: 'Pantry Items',
        icon: '🥫',
        keywords: []
    }
};

let recipes = [];
let currentPlan = null;

// Parse CSV data
function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        
        // End of line
        if (!inQuotes) {
            currentRow.push(currentField.trim());
            
            if (currentRow.length === headers.length && currentRow[0]) {
                const obj = {};
                headers.forEach((header, idx) => {
                    obj[header] = currentRow[idx];
                });
                data.push(obj);
            }
            
            currentRow = [];
            currentField = '';
        } else {
            currentField += '\n';
        }
    }
    
    return data;
}

// Fetch recipes from Google Sheets
async function fetchRecipes() {
    try {
        const response = await fetch(SHEET_URL);
        const csv = await response.text();
        recipes = parseCSV(csv);
        console.log(`Loaded ${recipes.length} recipes`);
        return recipes;
    } catch (error) {
        console.error('Error fetching recipes:', error);
        throw new Error('Failed to load recipes. Please check your internet connection.');
    }
}

// Parse ingredients from text
function parseIngredients(ingredientText) {
    if (!ingredientText) return [];
    return ingredientText.split('\n')
        .map(ing => ing.trim())
        .filter(ing => ing.length > 0);
}

// Categorize an ingredient
function categorizeIngredient(ingredient) {
    const ingredientLower = ingredient.toLowerCase();
    
    for (const [category, data] of Object.entries(CATEGORIES)) {
        if (category === 'pantry') continue;
        
        for (const keyword of data.keywords) {
            if (ingredientLower.includes(keyword)) {
                return category;
            }
        }
    }
    
    return 'pantry';
}

// Select random meals
function selectMeals(numMeals) {
    if (numMeals > recipes.length) {
        numMeals = recipes.length;
    }
    
    const shuffled = [...recipes].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numMeals);
}

// Parse quantity and unit from ingredient string
function parseIngredientQuantity(ingredient) {
    // Match patterns like "2 cups", "1/2 pound", "3 tablespoons", etc.
    const quantityPattern = /^(\d+\/?\d*\.?\d*)\s*(cup|cups|tablespoon|tablespoons|tbsp|teaspoon|teaspoons|tsp|pound|pounds|lb|lbs|ounce|ounces|oz|clove|cloves|can|cans|jar|jars|medium|large|small)?/i;
    const match = ingredient.match(quantityPattern);
    
    if (match) {
        const quantity = match[1];
        const unit = match[2] || '';
        const item = ingredient.replace(match[0], '').trim();
        return { quantity, unit, item, original: ingredient };
    }
    
    return { quantity: null, unit: '', item: ingredient, original: ingredient };
}

// Convert fraction string to decimal
function fractionToDecimal(fraction) {
    if (fraction.includes('/')) {
        const parts = fraction.split('/');
        return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
    return parseFloat(fraction);
}

// Normalize unit names
function normalizeUnit(unit) {
    const unitMap = {
        'cup': 'cup',
        'cups': 'cup',
        'tablespoon': 'tbsp',
        'tablespoons': 'tbsp',
        'tbsp': 'tbsp',
        'teaspoon': 'tsp',
        'teaspoons': 'tsp',
        'tsp': 'tsp',
        'pound': 'lb',
        'pounds': 'lb',
        'lb': 'lb',
        'lbs': 'lb',
        'ounce': 'oz',
        'ounces': 'oz',
        'oz': 'oz',
        'clove': 'clove',
        'cloves': 'clove',
        'can': 'can',
        'cans': 'can',
        'jar': 'jar',
        'jars': 'jar',
        'medium': 'medium',
        'large': 'large',
        'small': 'small'
    };
    
    return unitMap[unit.toLowerCase()] || unit.toLowerCase();
}

// Normalize ingredient name for comparison
function normalizeIngredientName(name) {
    // Remove common descriptors but keep important ones
    let normalized = name.toLowerCase()
        .replace(/\(.*?\)/g, '') // Remove parenthetical notes
        .replace(/,.*$/, '') // Remove everything after comma
        .replace(/\s+/g, ' ')
        .trim();
    
    // Remove common qualifiers that don't affect consolidation
    const removeWords = ['fresh', 'dried', 'chopped', 'diced', 'sliced', 'minced', 'peeled', 
                         'shredded', 'grated', 'crushed', 'whole', 'halved', 'quartered',
                         'optional', 'to taste', 'or more', 'about', 'approximately'];
    
    removeWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        normalized = normalized.replace(regex, '').trim();
    });
    
    // Clean up extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
}

// Generate grocery list from selected meals
function generateGroceryList(selectedMeals) {
    const groceryList = {};
    const consolidatedItems = {};
    
    // Initialize categories
    Object.keys(CATEGORIES).forEach(cat => {
        groceryList[cat] = [];
        consolidatedItems[cat] = {};
    });
    
    // Collect and consolidate ingredients
    selectedMeals.forEach(meal => {
        const ingredients = parseIngredients(meal['Ingredient List']);
        ingredients.forEach(ingredient => {
            const category = categorizeIngredient(ingredient);
            const parsed = parseIngredientQuantity(ingredient);
            const normalizedName = normalizeIngredientName(parsed.item);
            
            // Create a key for consolidation
            const unit = normalizeUnit(parsed.unit);
            const key = `${normalizedName}|||${unit}`;
            
            if (!consolidatedItems[category][key]) {
                consolidatedItems[category][key] = {
                    name: normalizedName,
                    unit: unit,
                    quantity: 0,
                    originalUnit: parsed.unit,
                    hasQuantity: false,
                    items: []
                };
            }
            
            // Add quantity if present
            if (parsed.quantity) {
                consolidatedItems[category][key].quantity += fractionToDecimal(parsed.quantity);
                consolidatedItems[category][key].hasQuantity = true;
            }
            
            // Keep track of original items for reference
            consolidatedItems[category][key].items.push(parsed.original);
        });
    });
    
    // Format consolidated items
    Object.keys(consolidatedItems).forEach(cat => {
        const items = consolidatedItems[cat];
        const formattedItems = [];
        
        Object.values(items).forEach(item => {
            if (item.hasQuantity && item.quantity > 0) {
                // Format quantity nicely
                let quantityStr = item.quantity.toString();
                
                // Convert to fraction if it makes sense
                if (item.quantity < 1) {
                    if (item.quantity === 0.5) quantityStr = '1/2';
                    else if (item.quantity === 0.25) quantityStr = '1/4';
                    else if (item.quantity === 0.75) quantityStr = '3/4';
                    else if (item.quantity === 0.333 || item.quantity.toFixed(2) === '0.33') quantityStr = '1/3';
                    else if (item.quantity === 0.666 || item.quantity.toFixed(2) === '0.67') quantityStr = '2/3';
                    else quantityStr = item.quantity.toFixed(2);
                } else if (item.quantity % 1 !== 0) {
                    // Has decimal part
                    const whole = Math.floor(item.quantity);
                    const decimal = item.quantity - whole;
                    
                    if (decimal === 0.5) quantityStr = `${whole} 1/2`;
                    else if (decimal === 0.25) quantityStr = `${whole} 1/4`;
                    else if (decimal === 0.75) quantityStr = `${whole} 3/4`;
                    else if (decimal.toFixed(2) === '0.33') quantityStr = `${whole} 1/3`;
                    else if (decimal.toFixed(2) === '0.67') quantityStr = `${whole} 2/3`;
                    else quantityStr = item.quantity.toFixed(2);
                }
                
                const unitStr = item.originalUnit || item.unit;
                const unitDisplay = unitStr ? ` ${unitStr}` : '';
                formattedItems.push(`${quantityStr}${unitDisplay} ${item.name}`);
            } else {
                // No quantity specified, just list the item
                // If multiple recipes have it, note that
                if (item.items.length > 1) {
                    formattedItems.push(`${item.name} (needed for ${item.items.length} recipes)`);
                } else {
                    formattedItems.push(item.name);
                }
            }
        });
        
        groceryList[cat] = formattedItems.sort();
    });
    
    return groceryList;
}

// Render meal plan
function renderMealPlan(selectedMeals) {
    const container = document.getElementById('mealPlanContent');
    container.innerHTML = '';
    
    selectedMeals.forEach((meal, index) => {
        const mealCard = document.createElement('div');
        mealCard.className = 'meal-card';
        mealCard.dataset.mealIndex = index;
        
        const mealName = meal['Meal Name'] || 'Unknown Meal';
        const recipeLink = meal['Recipe Link (if relevant)'] || '';
        const ingredients = parseIngredients(meal['Ingredient List']);
        
        let html = `
            <div class="meal-card-header">
                <div class="meal-card-title-section">
                    <div class="meal-night">Night ${index + 1}</div>
                    <div class="meal-title">${mealName}</div>
                </div>
                <button class="refresh-btn" onclick="refreshMeal(${index})">
                    🔄 Swap
                </button>
            </div>
        `;
        
        if (ingredients.length > 0) {
            html += '<ul class="ingredients-list">';
            ingredients.forEach(ing => {
                html += `<li>${ing}</li>`;
            });
            html += '</ul>';
        }
        
        if (recipeLink && recipeLink.trim() && recipeLink !== 'No formal recipe') {
            html += `<a href="${recipeLink}" target="_blank" class="recipe-link">View Recipe →</a>`;
        }
        
        mealCard.innerHTML = html;
        container.appendChild(mealCard);
    });
}

// Render grocery list
function renderGroceryList(groceryList) {
    const container = document.getElementById('groceryListContent');
    container.innerHTML = '';
    
    const categoryOrder = ['dairy', 'fruit', 'vegetables', 'herbs', 'proteins', 'frozen', 'pantry'];
    
    categoryOrder.forEach(catKey => {
        const items = groceryList[catKey];
        if (!items || items.length === 0) return;
        
        const category = CATEGORIES[catKey];
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        
        const title = document.createElement('div');
        title.className = 'category-title';
        title.innerHTML = `<span class="category-icon">${category.icon}</span> ${category.name}`;
        categoryDiv.appendChild(title);
        
        const itemsList = document.createElement('ul');
        itemsList.className = 'grocery-items-list';
        
        items.forEach(item => {
            const itemLi = document.createElement('li');
            itemLi.textContent = item;
            itemsList.appendChild(itemLi);
        });
        
        categoryDiv.appendChild(itemsList);
        container.appendChild(categoryDiv);
    });
}

// Generate meal plan
async function generateMealPlan() {
    const numMeals = parseInt(document.getElementById('numMeals').value);
    
    if (numMeals < 1 || numMeals > 14) {
        alert('Please enter a number between 1 and 14');
        return;
    }
    
    // Show loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').style.display = 'none';
    
    try {
        // Fetch recipes if not already loaded
        if (recipes.length === 0) {
            await fetchRecipes();
        }
        
        // Select meals
        const selectedMeals = selectMeals(numMeals);
        
        // Generate grocery list
        const groceryList = generateGroceryList(selectedMeals);
        
        // Store current plan
        currentPlan = {
            meals: selectedMeals,
            groceryList: groceryList
        };
        
        // Render
        renderMealPlan(selectedMeals);
        renderGroceryList(groceryList);
        
        // Show results
        document.getElementById('loading').style.display = 'none';
        document.getElementById('results').style.display = 'block';
        
        // Scroll to results
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        alert(error.message);
    }
}

// Print plan
function printPlan() {
    window.print();
}

// Copy to clipboard
function copyToClipboard() {
    if (!currentPlan) return;
    
    let text = '='.repeat(60) + '\n';
    text += 'YOUR MEAL PLAN\n';
    text += '='.repeat(60) + '\n\n';
    
    currentPlan.meals.forEach((meal, index) => {
        text += `Night ${index + 1}: ${meal['Meal Name']}\n`;
        text += '-'.repeat(60) + '\n';
        
        const ingredients = parseIngredients(meal['Ingredient List']);
        if (ingredients.length > 0) {
            text += 'Ingredients:\n';
            ingredients.forEach(ing => {
                text += `  • ${ing}\n`;
            });
        }
        
        const recipeLink = meal['Recipe Link (if relevant)'];
        if (recipeLink && recipeLink.trim() && recipeLink !== 'No formal recipe') {
            text += `Recipe: ${recipeLink}\n`;
        }
        
        text += '\n';
    });
    
    text += '\n' + '='.repeat(60) + '\n';
    text += 'GROCERY LIST\n';
    text += '='.repeat(60) + '\n\n';
    
    const categoryOrder = ['dairy', 'fruit', 'vegetables', 'herbs', 'proteins', 'frozen', 'pantry'];
    
    categoryOrder.forEach(catKey => {
        const items = currentPlan.groceryList[catKey];
        if (!items || items.length === 0) return;
        
        const category = CATEGORIES[catKey];
        text += `${category.icon} ${category.name.toUpperCase()}\n`;
        text += '-'.repeat(60) + '\n';
        
        items.forEach(item => {
            text += `  ☐ ${item}\n`;
        });
        
        text += '\n';
    });
    
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
        alert('Meal plan copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard. Please try again.');
    });
}

// Refresh a single meal
function refreshMeal(mealIndex) {
    if (!currentPlan) return;
    
    // Get list of meals not currently in the plan
    const currentMealNames = currentPlan.meals.map(m => m['Meal Name']);
    const availableMeals = recipes.filter(r => !currentMealNames.includes(r['Meal Name']));
    
    if (availableMeals.length === 0) {
        alert('No more recipes available to swap! You\'ve used all recipes in your database.');
        return;
    }
    
    // Select a random meal from available meals
    const newMeal = availableMeals[Math.floor(Math.random() * availableMeals.length)];
    
    // Replace the meal at the specified index
    currentPlan.meals[mealIndex] = newMeal;
    
    // Regenerate grocery list with updated meals
    currentPlan.groceryList = generateGroceryList(currentPlan.meals);
    
    // Re-render both meal plan and grocery list
    renderMealPlan(currentPlan.meals);
    renderGroceryList(currentPlan.groceryList);
    
    // Scroll to the refreshed meal
    const mealCard = document.querySelector(`[data-meal-index="${mealIndex}"]`);
    if (mealCard) {
        mealCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add a brief highlight animation
        mealCard.style.backgroundColor = '#e8eaf6';
        setTimeout(() => {
            mealCard.style.backgroundColor = '#f8f9fa';
        }, 1000);
    }
}

// Allow Enter key to submit
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('numMeals').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generateMealPlan();
        }
    });
});
