import { useMemo, useState } from "react";
import Modal from "../common/Modal";
import {
  fetchMealRecipes,
  type DietItem,
  type RecipeResult,
} from "../../services/routine.services";

type DietPlanSectionProps = {
  loading: boolean;
  error: string;
  generating: boolean;
  diet: DietItem[];
  onGenerateDiet: () => Promise<void>;
};

const DietPlanSection = ({
  loading,
  error,
  generating,
  diet,
  onGenerateDiet,
}: DietPlanSectionProps) => {
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [mealRecipes, setMealRecipes] = useState<RecipeResult[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState("");

  const selectedRecipe = useMemo(() => {
    if (mealRecipes.length === 0) return null;
    if (selectedRecipeId === null) return mealRecipes[0];
    return mealRecipes.find((recipe) => recipe.id === selectedRecipeId) ?? mealRecipes[0];
  }, [mealRecipes, selectedRecipeId]);

  const closeModal = () => {
    setIsRecipeModalOpen(false);
    setSelectedMeal("");
    setSelectedRecipeId(null);
    setMealRecipes([]);
    setRecipeError("");
    setRecipeLoading(false);
  };

  const handleMealClick = async (meal: string) => {
    setIsRecipeModalOpen(true);
    setSelectedMeal(meal);
    setSelectedRecipeId(null);
    setRecipeError("");
    setRecipeLoading(true);

    try {
      const recipes = await fetchMealRecipes(meal);
      setMealRecipes(recipes);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error && fetchError.message
          ? fetchError.message
          : "Failed to load recipe details";
      setRecipeError(message);
      setMealRecipes([]);
    } finally {
      setRecipeLoading(false);
    }
  };

  const normalizeText = (value: string) =>
    value
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const recipeTags = selectedRecipe
    ? [
        ...(selectedRecipe.cuisines ?? []),
        ...(selectedRecipe.dishTypes ?? []),
        ...(selectedRecipe.diets ?? []),
      ].filter(Boolean)
    : [];

  const ingredientList = selectedRecipe?.extendedIngredients ?? [];

  return (
    <section>
      <div className="section-header">
        <h3>Meals</h3>
        <button
          type="button"
          className="plan-generate-btn"
          onClick={onGenerateDiet}
          disabled={loading || generating}
        >
          {generating ? "Generating..." : "Generate Meals"}
        </button>
      </div>
      <div className="workout-plan">
        {loading && <p>Loading meals...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && diet.length === 0 && (
          <p>No melas here generete some</p>
        )}
        {!loading && !error && diet.length > 0 && (
          <div className="workout-table-wrap">
            <table className="workout-table">
              <thead>
                <tr>
                  <th>Meal</th>
                  <th>Items</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {diet.map((item, idx) => (
                  <tr key={`${item.meal}-${idx}`}>
                    <td>
                      <button
                        type="button"
                        className="meal-select-btn"
                        onClick={() => handleMealClick(item.meal)}
                      >
                        {item.meal}
                      </button>
                    </td>
                    <td>{item.items}</td>
                    <td>{item.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isRecipeModalOpen} onClose={closeModal}>
        <div className="recipe-modal">
          <div className="recipe-modal-header">
            <h4>{selectedMeal || "Recipe Details"}</h4>
            <button type="button" className="recipe-close-btn" onClick={closeModal}>
              Close
            </button>
          </div>

          {recipeLoading && <p>Loading recipe details...</p>}
          {!recipeLoading && recipeError && <p className="error">{recipeError}</p>}
          {!recipeLoading && !recipeError && mealRecipes.length === 0 && (
            <p>No recipes found for this meal.</p>
          )}

          {!recipeLoading && !recipeError && mealRecipes.length > 0 && selectedRecipe && (
            <div className="recipe-content">
              {mealRecipes.length > 1 && (
                <div className="recipe-tabs" role="tablist" aria-label="Matching recipes">
                  {mealRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      type="button"
                      className={
                        selectedRecipe.id === recipe.id
                          ? "recipe-tab recipe-tab--active"
                          : "recipe-tab"
                      }
                      onClick={() => setSelectedRecipeId(recipe.id)}
                    >
                      {recipe.title}
                    </button>
                  ))}
                </div>
              )}

              {selectedRecipe.image && (
                <img
                  src={selectedRecipe.image}
                  alt={selectedRecipe.title}
                  className="recipe-hero-image"
                />
              )}

              <h5>{selectedRecipe.title}</h5>

              <div className="recipe-metrics">
                <span>{selectedRecipe.readyInMinutes} min</span>
                <span>{selectedRecipe.servings} servings</span>
                <span>{Math.round(selectedRecipe.healthScore)} health</span>
                <span>{Math.round(selectedRecipe.spoonacularScore)} score</span>
                <span>${(selectedRecipe.pricePerServing / 100).toFixed(2)} / serving</span>
              </div>

              <div className="recipe-flags">
                {selectedRecipe.vegetarian && <span>Vegetarian</span>}
                {selectedRecipe.vegan && <span>Vegan</span>}
                {selectedRecipe.glutenFree && <span>Gluten Free</span>}
                {selectedRecipe.dairyFree && <span>Dairy Free</span>}
                {selectedRecipe.veryHealthy && <span>Very Healthy</span>}
                {selectedRecipe.sustainable && <span>Sustainable</span>}
                {selectedRecipe.cheap && <span>Budget Friendly</span>}
              </div>

              {recipeTags.length > 0 && (
                <p>
                  <strong>Tags:</strong> {recipeTags.join(", ")}
                </p>
              )}

              {selectedRecipe.summary && (
                <p>
                  <strong>Summary:</strong> {normalizeText(selectedRecipe.summary)}
                </p>
              )}

              {selectedRecipe.instructions && (
                <p>
                  <strong>Instructions:</strong> {normalizeText(selectedRecipe.instructions)}
                </p>
              )}

              {ingredientList.length > 0 && (
                <div>
                  <strong>Ingredients:</strong>
                  <ul className="recipe-ingredients-list">
                    {ingredientList.slice(0, 12).map((ingredient, idx) => (
                      <li key={`${ingredient.id ?? ingredient.name ?? "ingredient"}-${idx}`}>
                        {ingredient.original ?? ingredient.name ?? "Ingredient"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="recipe-links">
                {selectedRecipe.sourceUrl && (
                  <a href={selectedRecipe.sourceUrl} target="_blank" rel="noreferrer">
                    View full recipe
                  </a>
                )}
                {selectedRecipe.spoonacularSourceUrl && (
                  <a
                    href={selectedRecipe.spoonacularSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Spoonacular source
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
};

export default DietPlanSection;
