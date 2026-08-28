import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./features/auth/AuthProvider";
import { ThemeProvider } from "./features/theme/ThemeProvider";
import { UiStyleProvider } from "./features/theme/UiStyleProvider";
import { ToastProvider } from "./components/Toast";
import { QuizGenerationProvider } from "./features/quiz/QuizGenerationProvider";
import { CardGenerationProvider } from "./features/ai/CardGenerationProvider";
import { AppearanceProvider } from "./features/appearance/AppearanceProvider";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado");

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider>
          <UiStyleProvider>
            <BrowserRouter>
              <AuthProvider>
                <AppearanceProvider>
                  <ToastProvider>
                    <QuizGenerationProvider>
                      <CardGenerationProvider>
                        <App />
                      </CardGenerationProvider>
                    </QuizGenerationProvider>
                  </ToastProvider>
                </AppearanceProvider>
              </AuthProvider>
            </BrowserRouter>
          </UiStyleProvider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);
