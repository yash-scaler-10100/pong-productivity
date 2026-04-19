import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import ZenithApp from "@/components/ZenithApp";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ZenithApp />} />
      </Routes>
      <Toaster theme="dark" position="bottom-right" richColors />
    </BrowserRouter>
  );
}

export default App;
