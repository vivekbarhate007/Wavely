import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Overview from "./pages/Overview";
import Posts from "./pages/Posts";
import Topics from "./pages/Topics";
import Alerts from "./pages/Alerts";
import Digest from "./pages/Digest";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"        element={<Overview />} />
        <Route path="/posts"   element={<Posts />} />
        <Route path="/topics"  element={<Topics />} />
        <Route path="/alerts"  element={<Alerts />} />
        <Route path="/digest"  element={<Digest />} />
      </Routes>
    </Layout>
  );
}
