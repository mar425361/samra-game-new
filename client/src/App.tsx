// Design: نشرة الساحة — الإطار يبقي التجربة مباشرة وواضحة بين شاشة البث ولوحة المقدّم.
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";

export default function App() {
  return <ErrorBoundary><TooltipProvider><Home /><Toaster position="top-center" richColors /></TooltipProvider></ErrorBoundary>;
}
