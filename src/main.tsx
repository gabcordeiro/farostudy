import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { AuthProvider } from "./features/auth/AuthProvider";
import { ThemeProvider } from "./features/theme/ThemeProvider";
import { ToastProvider } from "./components/Toast";
import { QuizGenerationProvider } from "./features/quiz/QuizGenerationProvider";
import { AppearanceProvider } from "./features/appearance/AppearanceProvider";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado");

createRoot(root).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppearanceProvider>
              <ToastProvider>
                <QuizGenerationProvider>
                  <App />
                </QuizGenerationProvider>
              </ToastProvider>
            </AppearanceProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>,
);
