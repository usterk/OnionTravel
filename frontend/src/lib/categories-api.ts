import { api } from './api';
import type { Category, CategoryWithStats } from '@/types/models';

export interface CategoryCreate {
  name: string;
  color: string;
  icon?: string;
  budget_percentage?: number;
}

export interface CategoryUpdate {
  name?: string;
  color?: string;
  icon?: string;
  budget_percentage?: number;
}

/**
 * Get all categories for a trip
 * @param tripId - Trip ID
 * @param sortByUsage - If true, sort categories by expense frequency (most used first)
 */
export const getCategories = async (tripId: number, sortByUsage: boolean = false): Promise<Category[]> => {
  const response = await api.get<Category[]>(`/trips/${tripId}/categories`, {
    params: sortByUsage ? { sort_by_usage: true } : undefined
  });
  return response.data;
};

/**
 * Get all categories with spending statistics
 */
export const getCategoriesWithStats = async (tripId: number): Promise<CategoryWithStats[]> => {
  const response = await api.get<CategoryWithStats[]>(`/trips/${tripId}/categories/stats`);
  return response.data;
};

/**
 * Get a specific category
 */
export const getCategory = async (tripId: number, categoryId: number): Promise<Category> => {
  const response = await api.get<Category>(`/trips/${tripId}/categories/${categoryId}`);
  return response.data;
};

/**
 * Create a new category
 */
export const createCategory = async (tripId: number, data: CategoryCreate): Promise<Category> => {
  const response = await api.post<Category>(`/trips/${tripId}/categories`, data);
  return response.data;
};

/**
 * Initialize default categories for a trip
 */
export const initializeDefaultCategories = async (tripId: number): Promise<Category[]> => {
  const response = await api.post<Category[]>(`/trips/${tripId}/categories/defaults`);
  return response.data;
};

/**
 * Update a category
 */
export const updateCategory = async (
  tripId: number,
  categoryId: number,
  data: CategoryUpdate
): Promise<Category> => {
  const response = await api.put<Category>(`/trips/${tripId}/categories/${categoryId}`, data);
  return response.data;
};

/**
 * Delete a category
 */
export const deleteCategory = async (tripId: number, categoryId: number): Promise<void> => {
  await api.delete(`/trips/${tripId}/categories/${categoryId}`);
};

/**
 * Reorder categories
 */
export const reorderCategories = async (tripId: number, categoryIds: number[]): Promise<Category[]> => {
  const response = await api.post<Category[]>(`/trips/${tripId}/categories/reorder`, {
    category_ids: categoryIds,
  });
  return response.data;
};
