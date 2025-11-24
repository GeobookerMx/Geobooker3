// src/contexts/AppContext.jsx
import React, { createContext, useContext, useState } from "react";
import { supabase } from "../lib/supabase";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 19.4326, lng: -99.1332 }); // CDMX por defecto
  const [searchResults, setSearchResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🏢 Cargar negocios desde Supabase
  const loadBusinesses = async (filters = {}) => {
    try {
      setLoading(true);
      let query = supabase.from("businesses").select("*");

      if (filters.category) {
        query = query.eq("category", filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;

      setBusinesses(data || []);
      return data;
    } catch (error) {
      console.error("Error loading businesses:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Buscar negocios por texto
  const searchBusinesses = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === "") {
      setSearchResults([]);
      return [];
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .or(
          `business_name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,subcategory.ilike.%${searchTerm}%`
        );

      if (error) throw error;

      setSearchResults(data || []);
      return data;
    } catch (error) {
      console.error("Error searching businesses:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const selectBusiness = (business) => {
    setSelectedBusiness(business);
    if (business?.lat && business?.lng) {
      setMapCenter({ lat: business.lat, lng: business.lng });
    }
  };

  const value = {
    // estado
    businesses,
    selectedBusiness,
    mapCenter,
    searchResults,
    categories,
    loading,
    // setters
    setMapCenter,
    setCategories,
    // acciones
    loadBusinesses,
    searchBusinesses,
    selectBusiness,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp debe usarse dentro de un <AppProvider>");
  }
  return ctx;
};

export default AppContext;
