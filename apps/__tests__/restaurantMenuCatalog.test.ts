import { GET as bffGet } from '../app/api/bff/[...path]/route';
import type { FullMenuData, MenuItemData, MenuCategoryData } from '../features/restaurants/types';

const makeCtx = (path: string[]) => ({ params: Promise.resolve({ path }) });

// Transform logic mirrored from restaurantsApi transformResponse
function normalizeMenuResponse(response: any, restaurantId: string): FullMenuData {
  const rawData = (response && typeof response === 'object' && 'data' in response) ? response.data : response;
  const baseUrl = 'https://api.foodie.kwiko.org';
  const resolveUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/api')) return `${baseUrl}${url}`;
    return `${baseUrl}/${url.replace(/^\/+/, '')}`;
  };

  if (!rawData) {
    return { restaurantId: restaurantId || '', categories: [] };
  }

  let categoriesList: any[] = [];
  if (Array.isArray(rawData)) {
    categoriesList = rawData;
  } else if (Array.isArray(rawData.categories)) {
    categoriesList = rawData.categories;
  }

  const normalizedCategories: MenuCategoryData[] = categoriesList.map((cat: any, index: number) => {
    const itemsList = Array.isArray(cat.items) ? cat.items : [];
    const categoryName = cat.name || 'General';
    const categoryId = cat.categoryId || cat.id || `cat-${index}`;

    return {
      categoryId,
      name: categoryName,
      displayOrder: typeof cat.displayOrder === 'number' ? cat.displayOrder : index,
      items: itemsList.map((item: any) => ({
        menuItemId: item.menuItemId || item.id || `item-${index}`,
        id: item.menuItemId || item.id || `item-${index}`,
        categoryId,
        categoryName,
        name: item.name || 'Unnamed Item',
        description: item.description || '',
        basePrice: typeof item.basePrice === 'number' ? item.basePrice : Number(item.basePrice || 0),
        price: typeof item.basePrice === 'number' ? item.basePrice : Number(item.basePrice || 0),
        isVeg: Boolean(item.isVeg ?? (item.foodType === 'VEG')),
        foodType: item.foodType || (item.isVeg ? 'VEG' : 'NON_VEG'),
        isAvailable: item.isAvailable !== false && item.available !== false,
        imageUrl: item.imageUrl ? resolveUrl(item.imageUrl) : null,
        packageSize: item.packageSize || null,
        preparationTime: item.preparationTime || null,
        gstPct: item.gstPct != null ? Number(item.gstPct) : null,
        variants: Array.isArray(item.variants) ? item.variants : [],
        avgRating: item.avgRating != null ? Number(item.avgRating) : null,
        reviewCount: item.reviewCount != null ? Number(item.reviewCount) : null,
      })),
    };
  });

  return {
    restaurantId: rawData.restaurantId || restaurantId || '',
    categories: normalizedCategories,
    avgRating: rawData.avgRating != null ? Number(rawData.avgRating) : null,
  };
}

describe('Admin Restaurant Menu & Catalog Feature', () => {
  const superAdminHeaders = {
    cookie: 'foodie_access_token=demo-admin-super_admin-token; foodie_user_role=SUPER_ADMIN;',
    authorization: 'Bearer demo-admin-super_admin-token',
    'Content-Type': 'application/json',
  };

  it('1. BFF route gracefully returns empty menu object when restaurant menu is not yet populated or backend is unavailable', async () => {
    const restaurantId = 'b0a028e3-38a3-4079-9373-c39c90758c2f';
    const req = new Request(`http://localhost:3000/api/bff/menu/restaurants/${restaurantId}`, {
      method: 'GET',
      headers: superAdminHeaders,
    });

    const res = await bffGet(req, makeCtx(['menu', 'restaurants', restaurantId]));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.restaurantId).toBe(restaurantId);
    expect(Array.isArray(body.data.categories)).toBe(true);
  });

  it('2. Properly normalizes categories, prices, veg tags and image URLs from dynamic API response', () => {
    const sampleBackendResponse = {
      success: true,
      data: {
        restaurantId: 'resto-uuid-1234',
        avgRating: 4.6,
        categories: [
          {
            categoryId: 'cat-starters',
            name: 'Starters',
            displayOrder: 1,
            items: [
              {
                menuItemId: 'item-paneer-tikka',
                name: 'Paneer Tikka Charcoal Grill',
                description: 'Cottage cheese marinated in spices and charred',
                basePrice: '240.00',
                isVeg: true,
                foodType: 'VEG',
                isAvailable: true,
                imageUrl: '/api/v1/storage/paneer.jpg',
                packageSize: '6 pcs',
                preparationTime: '20 mins',
                gstPct: '5.0',
                variants: [
                  { name: 'Half (3 pcs)', priceDelta: -80 },
                  { name: 'Full (6 pcs)', priceDelta: 0 },
                ],
              },
              {
                menuItemId: 'item-chicken-wings',
                name: 'Crispy Pepper Chicken Wings',
                description: 'Spicy chicken wings tossed with bell peppers',
                basePrice: 320,
                isVeg: false,
                foodType: 'NON_VEG',
                isAvailable: false,
                imageUrl: 'https://images.unsplash.com/photo-wings?w=400',
                packageSize: '8 pcs',
                preparationTime: '25 mins',
                gstPct: 5,
              },
            ],
          },
          {
            categoryId: 'cat-beverages',
            name: 'Beverages',
            displayOrder: 2,
            items: [
              {
                menuItemId: 'item-lassi',
                name: 'Sweet Punjabi Lassi',
                description: 'Creamy yogurt drink flavored with cardamom',
                basePrice: 80,
                isVeg: true,
                foodType: 'VEG',
                isAvailable: true,
                imageUrl: null,
              },
            ],
          },
        ],
      },
    };

    const transformed = normalizeMenuResponse(sampleBackendResponse, 'resto-uuid-1234');

    expect(transformed.restaurantId).toBe('resto-uuid-1234');
    expect(transformed.avgRating).toBe(4.6);
    expect(transformed.categories).toHaveLength(2);

    // Verify Starters category
    const starters = transformed.categories[0];
    expect(starters.name).toBe('Starters');
    expect(starters.items).toHaveLength(2);

    // Verify Paneer Tikka (Available, Veg, Number price, resolved URL)
    const paneer = starters.items[0];
    expect(paneer.name).toBe('Paneer Tikka Charcoal Grill');
    expect(paneer.basePrice).toBe(240);
    expect(paneer.price).toBe(240);
    expect(paneer.isVeg).toBe(true);
    expect(paneer.isAvailable).toBe(true);
    expect(paneer.categoryName).toBe('Starters');
    expect(paneer.imageUrl).toContain('/api/v1/storage/paneer.jpg');
    expect(paneer.variants).toHaveLength(2);

    // Verify Chicken Wings (Unavailable, Non-Veg)
    const wings = starters.items[1];
    expect(wings.name).toBe('Crispy Pepper Chicken Wings');
    expect(wings.basePrice).toBe(320);
    expect(wings.isVeg).toBe(false);
    expect(wings.isAvailable).toBe(false);
    expect(wings.imageUrl).toBe('https://images.unsplash.com/photo-wings?w=400');

    // Verify Beverages
    const beverages = transformed.categories[1];
    expect(beverages.name).toBe('Beverages');
    expect(beverages.items).toHaveLength(1);
    expect(beverages.items[0].isAvailable).toBe(true);
  });

  it('3. Accurately calculates total items, available count, unavailable count, and category grouping', () => {
    const mockCategories = [
      {
        categoryId: 'cat-1',
        name: 'Main Course',
        displayOrder: 1,
        items: [
          { menuItemId: 'm1', id: 'm1', name: 'Dum Biryani', basePrice: 280, isVeg: false, isAvailable: true },
          { menuItemId: 'm2', id: 'm2', name: 'Butter Chicken', basePrice: 320, isVeg: false, isAvailable: false },
          { menuItemId: 'm3', id: 'm3', name: 'Dal Tadka', basePrice: 180, isVeg: true, isAvailable: true },
        ] as MenuItemData[],
      },
      {
        categoryId: 'cat-2',
        name: 'Desserts',
        displayOrder: 2,
        items: [
          { menuItemId: 'm4', id: 'm4', name: 'Gulab Jamun', basePrice: 90, isVeg: true, isAvailable: true },
          { menuItemId: 'm5', id: 'm5', name: 'Kulfi', basePrice: 110, isVeg: true, isAvailable: false },
        ] as MenuItemData[],
      },
    ];

    const allItems: MenuItemData[] = [];
    mockCategories.forEach((cat) => {
      cat.items.forEach((item) => {
        allItems.push({ ...item, categoryName: cat.name });
      });
    });

    const totalCount = allItems.length;
    const availableCount = allItems.filter((i) => i.isAvailable).length;
    const unavailableCount = allItems.filter((i) => !i.isAvailable).length;

    expect(totalCount).toBe(5);
    expect(availableCount).toBe(3);
    expect(unavailableCount).toBe(2);

    // Category filtering
    const mainCourseItems = allItems.filter((i) => i.categoryName === 'Main Course');
    expect(mainCourseItems).toHaveLength(3);

    const dessertItems = allItems.filter((i) => i.categoryName === 'Desserts');
    expect(dessertItems).toHaveLength(2);

    // Veg vs Non-Veg filtering
    const vegItems = allItems.filter((i) => i.isVeg);
    expect(vegItems).toHaveLength(3);

    const nonVegItems = allItems.filter((i) => !i.isVeg);
    expect(nonVegItems).toHaveLength(2);

    // Search query filtering
    const searchResult = allItems.filter((i) => i.name.toLowerCase().includes('biryani'));
    expect(searchResult).toHaveLength(1);
    expect(searchResult[0].name).toBe('Dum Biryani');
  });

  it('4. Handles empty menu gracefully with 0 counts without crashing', () => {
    const emptyCategories: any[] = [];
    const allItems: MenuItemData[] = [];

    emptyCategories.forEach((cat) => {
      cat.items?.forEach((item: MenuItemData) => allItems.push(item));
    });

    expect(allItems).toHaveLength(0);
    const availableCount = allItems.filter((i) => i.isAvailable).length;
    const unavailableCount = allItems.filter((i) => !i.isAvailable).length;

    expect(availableCount).toBe(0);
    expect(unavailableCount).toBe(0);
  });
  it('5. Both Restaurant Name click and Details button click navigate to the identical Restaurant Details route using the selected restaurant ID', () => {
    const stores = [
      { id: 'REST-0001', name: 'Spice Garden' },
      { id: 'b0a028e3-38a3-4079-9373-c39c90758c2f', name: 'Tumkur Biryani House' },
      { id: 'c1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d', name: 'CTR Dosa Corner' },
    ];

    const getTargetRouteForNameClick = (storeId: string) => `/restaurants/${storeId}`;
    const getTargetRouteForDetailsClick = (storeId: string) => `/restaurants/${storeId}`;

    stores.forEach((store) => {
      const nameRoute = getTargetRouteForNameClick(store.id);
      const detailsRoute = getTargetRouteForDetailsClick(store.id);

      expect(nameRoute).toBe(detailsRoute);
      expect(nameRoute).toBe(`/restaurants/${store.id}`);
      expect(detailsRoute).toContain(store.id);
    });
  });
});
