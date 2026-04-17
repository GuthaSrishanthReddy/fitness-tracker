import axios from "axios";
import {env}  from "../src/config/env"

export const getMeals = async (
    meal:string,
    maxFat:number,
    minProtein:number,
    maxProtein:number
 ) => {
  const url = "https://api.spoonacular.com/recipes/complexSearch";

  const params = {
    query: meal,
    maxFat: maxFat,
    minProtein: minProtein,
    maxProtein: maxProtein,
    addRecipeInformation: true,
    number: 5
  };

  const headers = {
    "x-api-key": env.SPOONACULAR_API_KEY
  };

  const response = await axios.get(url, {
    headers,
    params
  });

  const {
    id,
    image,
    imageType,
    title,
    readyInMinutes,
    servings,
    sourceUrl,
    spoonacularSourceUrl,
    aggregateLikes,
    healthScore,
    spoonacularScore,
    pricePerServing,
    weightWatcherSmartPoints,
    cheap,
    veryHealthy,
    veryPopular,
    sustainable,
    vegetarian,
    vegan,
    glutenFree,
    dairyFree,
    lowFodmap,
    cuisines = [],
    dishTypes = [],
    diets = [],
    occasions = [],
    summary,
    instructions,
    analyzedInstructions = [],
    extendedIngredients = [],
    nutrition,
    winePairing
  } = response.data.results[0];

  console.log("Spoonacular API response:", response.data);
  return response.data;
};
getMeals("chicken", 20, 10, 30).then(data => console.log(data)).catch(error => console.error(error));