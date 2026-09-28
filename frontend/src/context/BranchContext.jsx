import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getAllRecords } from "../utils/db";

const BranchContext = createContext(null);

export const DEFAULT_BRANCHES = [
  { code: "HQ", name: "Head Office (Addis Ababa)", city: "Addis Ababa" },
  { code: "AA-MAIN", name: "Addis Ababa Main Branch", city: "Addis Ababa" },
  { code: "BOLE", name: "Bole International Airport Branch", city: "Addis Ababa" },
  { code: "DD", name: "Dire Dawa Branch", city: "Dire Dawa" },
  { code: "HAW", name: "Hawassa Branch", city: "Hawassa" },
  { code: "BD", name: "Bahir Dar Branch", city: "Bahir Dar" },
  { code: "MEK", name: "Mekelle Branch", city: "Mekelle" },
  { code: "ADA", name: "Adama Branch", city: "Adama" },
  { code: "JIM", name: "Jimma Branch", city: "Jimma" },
  { code: "GON", name: "Gondar Branch", city: "Gondar" },
  { code: "JIG", name: "Jigjiga Branch", city: "Jigjiga" },
  { code: "SEM", name: "Semera Branch", city: "Semera" },
  { code: "ASO", name: "Assosa Branch", city: "Assosa" },
  { code: "GAM", name: "Gambella Branch", city: "Gambella" }
];

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState(DEFAULT_BRANCHES);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedBranch, setSelectedBranchState] = useState(() => {
    return localStorage.getItem("ics_selected_branch") || "ALL";
  });

  const loadUser = useCallback(() => {
    try {
      const stored = localStorage.getItem("ics_auth_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
        const role = (parsed?.role || "").toUpperCase();
        if (role !== "ADMIN") {
          // Non-admin is strictly locked to their assigned branch
          const branchName = parsed.branch || "Head Office (Addis Ababa)";
          setSelectedBranchState(branchName);
          localStorage.setItem("ics_selected_branch", branchName);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (_) {}
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      const records = await getAllRecords("branches").catch(() => []);
      if (records && records.length > 0) {
        const active = records.filter(b => b.isActive !== false);
        if (active.length > 0) {
          setBranches(active);
        }
      }
    } catch (err) {
      console.warn("Branch load error, using default branches:", err);
    }
  }, []);

  useEffect(() => {
    loadUser();
    loadBranches();
    
    const handleStorageChange = () => {
      loadUser();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [loadUser, loadBranches]);

  const userRole = (currentUser?.role || "").toUpperCase();
  const isAdmin = userRole === "ADMIN";
  const userBranch = currentUser?.branch || "Head Office (Addis Ababa)";

  const setSelectedBranch = (branchName) => {
    if (!isAdmin) return; // Non-admin cannot switch branches
    setSelectedBranchState(branchName);
    localStorage.setItem("ics_selected_branch", branchName);
  };

  // Helper to filter record array by active branch
  const filterByBranch = useCallback((records = []) => {
    if (!Array.isArray(records)) return [];
    if (isAdmin && selectedBranch === "ALL") {
      return records;
    }
    const targetBranch = isAdmin ? selectedBranch : userBranch;
    return records.filter(r => {
      if (!r.branch) return true; // Legacy records without branch remain accessible
      return r.branch.toLowerCase().trim() === targetBranch.toLowerCase().trim();
    });
  }, [isAdmin, selectedBranch, userBranch]);

  return (
    <BranchContext.Provider value={{
      branches,
      setBranches,
      userBranch,
      selectedBranch: isAdmin ? selectedBranch : userBranch,
      setSelectedBranch,
      isAdmin,
      currentUser,
      filterByBranch,
      refreshBranches: loadBranches
    }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return ctx;
}

