/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // This migration is a placeholder for grade format update
  // Grade conversion happens automatically in the app code:
  // - In profile.tsx: grades are stringified before saving
  // - In AuthContext.tsx: grades are parsed when loading
  // - In accountService.ts: grades are parsed when fetching all accounts
  // 
  // Existing grades (old format as strings like "beginner") will be:
  // 1. Read as strings by the app
  // 2. Converted to new format on first save: {"system":"unknown","value":"","general_level":"beginner"}
  // 3. Persisted in new format
  
  console.log("Grade migration: automatic conversion enabled in app code")
}, (app) => {
  console.log("Grade migration rollback")
})
