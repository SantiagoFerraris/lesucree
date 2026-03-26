# Le Sucrée — Pastelería Artesanal

Sitio web para Le Sucrée, pastelería artesanal ubicada en Rosario, Santa Fe, Argentina.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- - **Styling:** Tailwind CSS + Shadcn/UI
  - - **Backend:** Supabase (Auth, Database, Edge Functions, Storage)
    - - **State:** TanStack React Query + React Context
      - - **Routing:** React Router v6
       
        - ## Getting Started
       
        - ```bash
          # Install dependencies
          npm install

          # Copy environment variables
          cp .env.example .env
          # Fill in your Supabase credentials in .env

          # Start dev server
          npm run dev
          ```

          ## Environment Variables

          See `.env.example` for required variables:

          - `VITE_SUPABASE_URL` — Your Supabase project URL
          - - `VITE_SUPABASE_PUBLISHABLE_KEY` — Your Supabase anon/public key
            - - `VITE_SUPABASE_PROJECT_ID` — Your Supabase project ID
             
              - ## Project Structure
             
              - ```
                src/
                  assets/        # Static images
                  components/    # Reusable UI components
                  contexts/      # React contexts (Auth, Cart)
                  hooks/         # Custom hooks
                  integrations/  # Supabase client & types
                  lib/           # Utilities & constants
                  pages/         # Route page components
                supabase/
                  functions/     # Edge Functions (email notifications)
                  migrations/    # Database migrations & RLS policies
                ```

                ## Scripts

                - `npm run dev` — Start development server
                - - `npm run build` — Production build
                  - - `npm run preview` — Preview production build
                    - - `npm run lint` — Run ESLint
                      - - `npm run test` — Run tests
