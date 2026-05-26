import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export const userAuthStore = create(
  devtools(
    persist(
      (set) => ({
        user: null,

        setUser: (newUser) =>
          set(
            { user: newUser },
            
          ),

        logout: () =>
          set(
            { user: null },
           
          ),

        
      }),
      {
        name: "user-auth-store",

        // ✅ Fix hydration issue
       
      }
    ),
    {
        name: "UserAuthStore",
    }
  )
);
