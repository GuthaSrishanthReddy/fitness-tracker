-- CreateTable
CREATE TABLE "DietRecipeDetail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "meal" TEXT NOT NULL,
    "mealKey" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "recipes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietRecipeDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DietRecipeDetail_userId_mealKey_key" ON "DietRecipeDetail"("userId", "mealKey");

-- CreateIndex
CREATE INDEX "DietRecipeDetail_userId_createdAt_idx" ON "DietRecipeDetail"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "DietRecipeDetail" ADD CONSTRAINT "DietRecipeDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
