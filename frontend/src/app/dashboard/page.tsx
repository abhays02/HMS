"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; 

interface Permission {
  name: string;
  description: string;
}

interface User {
  id: number;
  email: string;
  is_active: boolean;
  role: { name: string; permissions: Permission[] };
  location: { name: string };
  team: { name: string };
  role_id?: number;
  location_id?: number;
  team_id?: number;
  full_name?: string;
  phone_number?: string;
  locked_until?: string;
}

interface Patient {
    id: number;
    patient_id: string;
    first_name: string;
    last_name: string;
    dob: string;
    gender: string;
}

// --- ICONS ---
const Icons = {
    Home: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    Patients: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
    Audit: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    Profile: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Upload: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>,
    Check: () => <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
    Alert: () => <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
    Reports: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<"home" | "profile" | "patients" | "users" | "audit" | "reports">("home");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    fetchUser(token);
  }, [router]);

  const fetchUser = async (token: string) => {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed");
        setUser(await res.json());
    } catch {
        localStorage.removeItem("token");
        router.push("/");
    }
  };

  if (!user) return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-xl font-semibold text-gray-600 animate-pulse">Loading Dashboard...</div>
      </div>
  );

  const hasPerm = (perm: string) => user.role.permissions?.some(p => p.name === perm);

  // --- SIDEBAR NAVIGATION ---
  const NavItem = ({ label, Icon, view, visible = true }: any) => {
      if(!visible) return null;
      const isActive = activeView === view;
      return (
          <button 
              onClick={() => setActiveView(view)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
          >
              <Icon />
              {label}
          </button>
      );
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden text-black">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-900 flex flex-col shadow-xl z-20">
          {/* Logo / Brand */}
          <div className="h-16 flex items-center px-6 border-b border-gray-800">
              <span className="text-xl font-bold text-white tracking-wider">HMS Portal</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-6 space-y-1">
              <NavItem label="Overview" Icon={Icons.Home} view="home" />
              <NavItem label="Patient Records" Icon={Icons.Patients} view="patients" visible={hasPerm('patient.read')} />
              <NavItem label="User Directory" Icon={Icons.Users} view="users" visible={hasPerm('user.read')} />
              <NavItem label="Reports" Icon={Icons.Reports} view="reports" visible={hasPerm('report.view')} />
              <NavItem label="Audit Logs" Icon={Icons.Audit} view="audit" visible={hasPerm('audit.view')} />
              <div className="pt-4 pb-2">
                  <div className="border-t border-gray-800 mx-4"></div>
              </div>
              <NavItem label="My Profile" Icon={Icons.Profile} view="profile" />
          </nav>

          {/* User Footer */}
          <div className="p-4 bg-gray-900 border-t border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                      {user.role.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user.full_name || "User"}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
              </div>
              <button 
                  onClick={() => { localStorage.removeItem("token"); router.push("/"); }}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase rounded transition-colors"
              >
                  Sign Out
              </button>
          </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          
          {/* Top Header (Mobile specific or Breadcrumb) */}
          <header className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
              <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                      {activeView === 'home' && 'Dashboard Overview'}
                      {activeView === 'patients' && 'Patient Management'}
                      {activeView === 'users' && 'User Administration'}
                      {activeView === 'reports' && 'System Reports'}
                      {activeView === 'audit' && 'Security Audit'}
                      {activeView === 'profile' && 'My Profile'}
                  </h2>
                  <p className="text-sm text-gray-500">
                      {activeView === 'home' && `Welcome back, ${user.full_name || 'User'}. Here is your daily summary.`}
                      {activeView === 'patients' && 'Manage patient records, uploads, and details.'}
                      {activeView === 'users' && 'Manage system access and accounts.'}
                      {activeView === 'reports' && 'View system analytics and compliance metrics.'}
                      {activeView === 'profile' && 'Update your personal information and settings.'}
                  </p>
              </div>
              <div className="bg-gray-100 px-3 py-1 rounded text-xs font-mono text-gray-500 hidden">
                  Role: {user.role.name}
              </div>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-auto p-8">
              
              {activeView === "home" && (
                  <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <StatCard label="My Team" value={user.team.name} color="blue" />
                          <StatCard label="Location" value={user.location.name} color="green" />
                      </div>

                      {/* Quick Actions / Shortcuts */}
                      <h3 className="text-lg font-bold text-gray-700 mt-8">Quick Access</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {hasPerm('patient.read') && (
                              <ShortcutCard 
                                  title="View Patients" 
                                  desc="Go to the patient table" 
                                  Icon={Icons.Patients} 
                                  onClick={() => setActiveView('patients')} 
                              />
                           )}
                           {hasPerm('patient.create') && (
                              <ShortcutCard 
                                  title="Upload Data" 
                                  desc="Upload new .xlsx sheet" 
                                  Icon={Icons.Upload} 
                                  onClick={() => setActiveView('patients')} 
                              />
                           )}
                           <ShortcutCard 
                                title="Edit Profile" 
                                desc="Update account details" 
                                Icon={Icons.Profile} 
                                onClick={() => setActiveView('profile')} 
                            />
                      </div>
                      {!hasPerm('patient.read') && !hasPerm('user.read') && (
                          <div className="bg-orange-50 p-6 rounded-lg text-orange-800 border-l-4 border-orange-400 mt-6">
                              <h4 className="font-bold">Limited Access</h4>
                              <p className="text-sm mt-1">Your current role (Finance) does not have permission to view patient records or manage users. Contact an administrator to upgrade your access.</p>
                          </div>
                      )}
                  </div>
              )}

              {activeView === "patients" && hasPerm('patient.read') && (
                  <PatientManager 
                      canCreate={hasPerm('patient.create')} 
                      canUpdate={hasPerm('patient.update')} 
                      canDelete={hasPerm('patient.delete')} 
                  />
              )}

              {activeView === "users" && hasPerm('user.read') && <UserManager />}

              {activeView === "reports" && hasPerm('report.view') && <ReportsView />}

              {activeView === "audit" && hasPerm('audit.view') && <AuditViewer />}

              {activeView === "profile" && <ProfileView user={user} onUpdate={() => fetchUser(localStorage.getItem("token") || "")} />}

          </div>
      </main>
    </div>
  );
}

// --- SUB COMPONENTS ---

export function StatCard({ label, value, color }: any) {
    const borders: any = { blue: "border-blue-500", green: "border-green-500", purple: "border-purple-500" };
    const texts: any = { blue: "text-blue-600", green: "text-green-600", purple: "text-purple-600" };
    return (
        <div className={`bg-white p-6 rounded-lg shadow-sm border-l-4 ${borders[color]}`}>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</div>
            <div className={`text-3xl font-bold mt-2 ${texts[color]}`}>{value}</div>
        </div>
    );
}

function ShortcutCard({ title, desc, Icon, onClick }: any) {
    return (
        <div onClick={onClick} className="bg-white p-6 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow border border-gray-100 flex items-center gap-4 group">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                <Icon />
            </div>
            <div>
                <h4 className="font-bold text-gray-800">{title}</h4>
                <p className="text-xs text-gray-500">{desc}</p>
            </div>
        </div>
    );
}

function ProfileView({ user, onUpdate }: { user: User, onUpdate: () => void }) {
    const [formData, setFormData] = useState({ full_name: user.full_name || "", phone: user.phone_number || "" });
    const [msg, setMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/users/me/profile`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({ full_name: formData.full_name, phone_number: formData.phone })
            });
            if(res.ok) {
                setMsg("Profile Updated Successfully");
                onUpdate();
            } else {
                setMsg("Update Failed");
            }
        } catch { setMsg("Error updating profile"); }
    };

    return (
        <div className="max-w-2xl bg-white rounded-lg shadow p-8">
            {msg && <div className={`p-4 rounded mb-6 text-sm ${msg.includes("Success") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{msg}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                        <input type="text" value={user.email} disabled className="w-full p-3 border rounded bg-gray-50 text-gray-500 opacity-60 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                        <input type="text" value={user.role.name} disabled className="w-full p-3 border rounded bg-gray-50 text-gray-500 opacity-60 cursor-not-allowed" />
                    </div>
                </div>

                <div className="border-t pt-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Personal Details</h3>
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input 
                                type="text" 
                                value={formData.full_name} 
                                onChange={e => setFormData({...formData, full_name: e.target.value})}
                                className="w-full p-3 border rounded text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter your full name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input 
                                type="text" 
                                value={formData.phone} 
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="w-full p-3 border rounded text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-lg transform transition hover:-translate-y-0.5">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}

function PatientManager({ canCreate, canUpdate, canDelete }: any) {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [uploading, setUploading] = useState(false);
    const [notification, setNotification] = useState<{msg: string, type: 'success'|'error'} | null>(null);
    const [selectedFile, setSelectedFile] = useState<File|null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    
    // Feature State
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("patient_id");
    const [dragActive, setDragActive] = useState(false);
    const [editingId, setEditingId] = useState<number|null>(null);
    const [editForm, setEditForm] = useState<Partial<Patient>>({});
    
    // Bulk Actions
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [pageSize, setPageSize] = useState(10);

    const handleDownloadTemplate = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/patients/template`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "patient_template.xlsx";
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                 setNotification({msg: "Failed to download template", type: 'error'});
            }
        } catch (e) {
            console.error(e);
            setNotification({msg: "Error downloading template", type: 'error'});
        }
    };

    // Auto-dismiss notification
    useEffect(() => {
        if(notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const loadPatients = async () => {
        const query = `?search=${search}&skip=${page*pageSize}&limit=${pageSize}&sort_by=${sortBy}`;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/patients/${query}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        if(res.ok) {
            setPatients(await res.json());
            // Reset selection on page change or refresh if needed, but keeping it usually better UX unless navigating away
        }
    };
    
    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => { setPage(0); loadPatients(); }, 300);
        return () => clearTimeout(timer);
    }, [search, sortBy, pageSize]);
    
    useEffect(() => { loadPatients(); }, [page]); // Reload on page change

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
    };

    const confirmUpload = async () => {
        if(!selectedFile) return;
        setUploading(true);
        setUploadProgress(5);
        setNotification(null);
        
        const fd = new FormData();
        fd.append("file", selectedFile);
        
        const timer = setInterval(() => setUploadProgress(p => p < 90 ? p + 5 : p), 200);
        
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/patients/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: fd
            });
            
            clearInterval(timer);
            setUploadProgress(100);
            
            if(res.ok) {
                setNotification({msg: "Spreadsheet processed successfully", type: 'success'});
                loadPatients();
                setTimeout(() => { setSelectedFile(null); setNotification(null); }, 1000); 
            } else if (res.status === 403) {
                 setNotification({msg: "Access Denied: Ask permission from admin", type: 'error'});
            } else {
                const d = await res.json();
                setNotification({msg: d.detail || "Upload Failed", type: 'error'});
            }
        } catch { 
            clearInterval(timer);
            setNotification({msg: "Network Error", type: 'error'}); 
        }
        setTimeout(() => setUploading(false), 1000);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if(e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if(e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    };

    const startEdit = (p: Patient) => {
        setEditingId(p.id);
        setEditForm(p);
    };

    const saveEdit = async () => {
        if(!editingId) return;
        try {
             const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/patients/${editingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify(editForm)
            });
            if(res.ok) {
                setNotification({msg: "Record Updated", type: 'success'});
                setEditingId(null);
                loadPatients();
            } else if (res.status === 403) {
                 setNotification({msg: "Access Denied: Permission required", type: 'error'});
            } else {
                setNotification({msg: "Update Failed", type: 'error'});
            }
        } catch { setNotification({msg: "Error", type: 'error'}); }
    };

    const handleDelete = async (id: number) => {
        if(!window.confirm("Confirm deletion of this encrypted record?")) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/patients/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            if (res.ok) {
                loadPatients();
                setNotification({msg: "Record deleted", type: 'success'});
            } else if (res.status === 403) {
                 setNotification({msg: "Access Denied: Ask permission from admin", type: 'error'});
            } else {
                 setNotification({msg: "Delete Failed", type: 'error'});
            }
        } catch { setNotification({msg: "Delete Failed", type: 'error'}); }
    };
    
    // Bulk Delete
    const toggleSelect = (id: number) => {
        const next = new Set(selectedIds);
        if(next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };
    
    const toggleSelectAll = () => {
        if(selectedIds.size === patients.length && patients.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(patients.map(p => p.id)));
        }
    };
    
    const handleBulkDelete = async () => {
        if(selectedIds.size === 0) return;
        if(!window.confirm(`Permanently delete ${selectedIds.size} records?`)) return;
        
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/patients/bulk-delete`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}` 
                },
                body: JSON.stringify(Array.from(selectedIds))
            });
            
            if(res.ok) {
                 setNotification({msg: `Deleted ${selectedIds.size} records`, type: 'success'});
                 setSelectedIds(new Set());
                 loadPatients();
            } else if (res.status === 403) {
                 setNotification({msg: "Access Denied: Ask permission from admin", type: 'error'});
            } else {
                 setNotification({msg: "Bulk Delete Failed", type: 'error'});
            }
        } catch { setNotification({msg: "Network Error", type: 'error'}); }
    };

    return (
        <div className="space-y-6">
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded shadow-lg border-l-4 transform transition-all duration-500 ease-in-out ${notification.type === 'success' ? 'bg-white border-green-500 text-green-700' : 'bg-white border-red-500 text-red-700'}`}>
                    <div className="flex items-center gap-3">
                        {notification.type === 'success' ? <Icons.Check /> : <Icons.Alert />}
                        <p className="font-medium">{notification.msg}</p>
                    </div>
                </div>
            )}

            {selectedFile && (
                <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Upload Data</h3>
                                <p className="text-sm text-slate-500 mt-1">Review your file before processing.</p>
                            </div>
                            {!uploading && (
                                <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-slate-600">
                                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                            )}
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <Icons.Upload />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{selectedFile.name}</p>
                                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB • .xlsx Spreadsheet</p>
                                </div>
                            </div>
                            
                            {uploading && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-slate-600">
                                        <span>Encrypting & Processing...</span>
                                        <span>{Math.round(uploadProgress)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-500 transition-all duration-300 ease-out relative" 
                                            style={{ width: `${uploadProgress}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!uploading && (
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setSelectedFile(null)}
                                        className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={confirmUpload}
                                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
                                    >
                                        Process File
                                    </button>
                                </div>
                                {notification && notification.type === 'error' && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm flex items-start gap-2 text-red-700 animate-pulse">
                                        <Icons.Alert />
                                        <span>{notification.msg}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Toolbar */}
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-800">Encrypted Patient Storage</h3>
                        <p className="text-sm text-slate-500">Secure AES-256 Storage • {patients.length} Visible</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {selectedIds.size > 0 && canDelete && (
                            <button 
                                onClick={handleBulkDelete}
                                className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-lg hover:bg-red-100 transition-colors animate-pulse"
                            >
                                Delete {selectedIds.size} Selected
                            </button>
                        )}
                        <input 
                            type="text" 
                            placeholder="Search by ID..." 
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button 
                            onClick={handleDownloadTemplate}
                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Template
                        </button>
                        {canCreate && (
                             <label className="cursor-pointer px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2">
                                <Icons.Upload />
                                <span className="hidden md:inline">Upload</span>
                                <input type="file" className="hidden" accept=".xlsx" onChange={handleFileSelect} disabled={uploading} />
                             </label>
                        )}
                    </div>
                </div>
                
                {/* Drag and Drop Zone */}
                {canCreate && (
                    <div 
                        className={`mx-6 mt-6 p-8 border-2 border-dashed rounded-xl text-center transition-colors cursor-pointer ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
                        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                    >
                        <input type="file" id="file-upload" hidden accept=".xlsx" onChange={handleFileSelect} disabled={uploading} />
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <div className="mb-3 flex justify-center text-indigo-500 text-opacity-80">
                                <Icons.Upload />
                            </div>
                            <p className="text-slate-800 font-bold">
                                {uploading ? "Encrypting & Uploading..." : "Click or Drag Spreadsheet Here"}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">Accepts .xlsx files only</p>
                        </label>
                    </div>
                )}

                {/* Table */}
                <div className="p-6 overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead>
                            <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider font-semibold text-xs border-b border-slate-200">
                                <th className="px-6 py-4 w-4">
                                     <input type="checkbox" onChange={toggleSelectAll} 
                                        checked={patients.length > 0 && selectedIds.size === patients.length}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                     />
                                </th>
                                <th onClick={() => setSortBy('patient_id')} className="px-6 py-4 cursor-pointer hover:text-indigo-600">ID ↕</th>
                                <th className="px-6 py-4">Full Name</th>
                                <th className="px-6 py-4">Date of Birth</th>
                                <th className="px-6 py-4">Gender</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {patients.map(p => (
                                <tr key={p.id} className={`hover:bg-slate-50 transition-colors group ${selectedIds.has(p.id) ? 'bg-indigo-50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} 
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </td>
                                    {editingId === p.id ? (
                                        // Edit Mode Row
                                        <>
                                            <td className="px-6 py-4 text-slate-500">{p.patient_id}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <input className="border rounded px-2 py-1 w-24" value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} />
                                                    <input className="border rounded px-2 py-1 w-24" value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><input className="border rounded px-2 py-1 w-32" value={editForm.dob} onChange={e => setEditForm({...editForm, dob: e.target.value})} /></td>
                                            <td className="px-6 py-4"><input className="border rounded px-2 py-1 w-24" value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})} /></td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button onClick={saveEdit} className="text-green-600 font-bold hover:underline">Save</button>
                                                <button onClick={() => setEditingId(null)} className="text-slate-500 hover:underline">Cancel</button>
                                            </td>
                                        </>
                                    ) : (
                                        // View Mode Row
                                        <>
                                            <td className="px-6 py-4 font-mono text-slate-600 font-medium">{p.patient_id}</td>
                                            <td className="px-6 py-4 text-slate-900 font-semibold">{p.first_name} {p.last_name}</td>
                                            <td className="px-6 py-4 text-slate-500">{p.dob}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.gender === 'Male' ? 'bg-blue-100 text-blue-800' : p.gender === 'Female' ? 'bg-pink-100 text-pink-800' : 'bg-slate-100 text-slate-800'}`}>
                                                    {p.gender}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                {canUpdate && <button onClick={() => startEdit(p)} className="text-indigo-600 hover:text-indigo-900 mr-4 font-medium">Edit</button>}
                                                {canDelete && <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            {patients.length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No encrypted records found matching your query.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Footer */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-500">Page {page + 1}</span>
                        <div className="flex items-center gap-2">
                             <span className="text-xs text-slate-500">Rows:</span>
                             <select 
                                value={pageSize} 
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                                className="text-xs border border-slate-300 rounded p-1 bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                             >
                                 <option value={5}>5</option>
                                 <option value={10}>10</option>
                                 <option value={20}>20</option>
                                 <option value={50}>50</option>
                                 <option value={100}>100</option>
                                 <option value={500}>500</option>
                                 <option value={1000}>1,000</option>
                                 <option value={10000}>10,000</option>
                             </select>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <button 
                            disabled={page === 0} 
                            onClick={() => setPage(page - 1)}
                            className="px-3 py-1 bg-white border border-slate-300 rounded text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button 
                            disabled={patients.length < pageSize} 
                            onClick={() => setPage(page + 1)}
                            className="px-3 py-1 bg-white border border-slate-300 rounded text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function UserManager() {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [permissions, setPermissions] = useState<any[]>([]);
    
    const [view, setView] = useState<'users' | 'meta' | 'roles'>('users');
    const [msg, setMsg] = useState<{text: string, type: 'success' | 'error'} | null>(null);
    
    // User Action User State
    const [showUserModal, setShowUserModal] = useState(false);
    const [newUser, setNewUser] = useState({email: "", password: "", role_id: "", location_id: "", team_id: "", full_name: "", phone: ""});
    
    // Edit User State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({ role_id: "", location_id: "", team_id: "", full_name: "", phone: "" });

    // Role Config State
    const [newRole, setNewRole] = useState("");
    const [selectedRole, setSelectedRole] = useState<any | null>(null);
    const [rolePerms, setRolePerms] = useState<number[]>([]);

    // Reset Pass State
    const [resetId, setResetId] = useState<number|null>(null);
    const [newPass, setNewPass] = useState("");
    
    // Meta State
    const [newLoc, setNewLoc] = useState("");
    const [newTeam, setNewTeam] = useState("");

    const api = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}`;
    const authHeaders = { Authorization: `Bearer ${localStorage.getItem("token")}` };

    useEffect(() => {
        if(msg) {
            const timer = setTimeout(() => setMsg(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [msg]);

    const loadRefData = () => {
        fetch(`${api}/admin/roles`, { headers: authHeaders }).then(r => r.json()).then(setRoles);
        fetch(`${api}/admin/locations`, { headers: authHeaders }).then(r => r.json()).then(setLocations);
        fetch(`${api}/admin/teams`, { headers: authHeaders }).then(r => r.json()).then(setTeams);
        fetch(`${api}/admin/permissions`, { headers: authHeaders }).then(r => r.json()).then(setPermissions);
    };

    const loadUsers = () => {
        fetch(`${api}/admin/users`, { headers: authHeaders }).then(r => r.json()).then(d => { if(Array.isArray(d)) setUsers(d); });
    };
    
    useEffect(() => { loadUsers(); loadRefData(); }, []);

    const createUser = async () => {
        try {
            const res = await fetch(`${api}/admin/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({
                    email: newUser.email,
                    password: newUser.password,
                    role_id: Number(newUser.role_id),
                    location_id: Number(newUser.location_id),
                    team_id: Number(newUser.team_id),
                    full_name: newUser.full_name,
                    phone_number: newUser.phone
                })
            });
            if(res.ok) {
                setMsg({text: "User Created", type: "success"});
                setShowUserModal(false);
                setNewUser({email: "", password: "", role_id: "", location_id: "", team_id: "", full_name: "", phone: ""});
                loadUsers();
            } else {
                const d = await res.json();
                setMsg({text: d.detail || "Creation Failed", type: "error"});
            }
        } catch { setMsg({text: "Network Error", type: "error"}); }
    };

    const startEditUser = (u: User) => {
        setEditingUser(u);
        setEditForm({
            role_id: u.role_id?.toString() || roles.find(r => r.name === u.role.name)?.id || "",
            location_id: u.location_id?.toString() || locations.find(l => l.name === u.location.name)?.id || "", 
            team_id: u.team_id?.toString() || teams.find(t => t.name === u.team.name)?.id || "",
            full_name: u.full_name || "",
            phone: u.phone_number || ""
        });
    };

    const updateUser = async () => {
        if (!editingUser) return;
        try {
            const res = await fetch(`${api}/admin/users/${editingUser.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({
                    role_id: Number(editForm.role_id),
                    location_id: Number(editForm.location_id),
                    team_id: Number(editForm.team_id),
                    full_name: editForm.full_name,
                    phone_number: editForm.phone
                })
            });
            if(res.ok) {
                setMsg({text: "User Updated", type: "success"});
                setEditingUser(null);
                loadUsers();
            } else {
                setMsg({text: "Update Failed", type: "error"});
            }
        } catch { setMsg({text: "Network Error", type: "error"}); }
    };

    const addLocation = async () => {
        if(!newLoc) return;
        const res = await fetch(`${api}/admin/locations`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ name: newLoc })
        });
        if(res.ok) { setMsg({text: "Location Added", type: "success"}); setNewLoc(""); loadRefData(); }
    };

    const addTeam = async () => {
        if(!newTeam) return;
        const res = await fetch(`${api}/admin/teams`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ name: newTeam })
        });
        if(res.ok) { setMsg({text: "Team Added", type: "success"}); setNewTeam(""); loadRefData(); }
    };

    const handleUnlock = async (id: number) => {
        const res = await fetch(`${api}/admin/users/${id}/unlock`, { method: "POST", headers: authHeaders });
        if(res.ok) { setMsg({text: "User Unblocked", type: "success"}); loadUsers(); }
    };

    const confirmReset = async () => {
        if(!resetId || !newPass) return;
        const res = await fetch(`${api}/admin/users/${resetId}/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ new_password: newPass })
        });
        if(res.ok) setMsg({text: "Password Reset", type: "success"});
        setResetId(null); setNewPass("");
    };

    const addRole = async () => {
        if(!newRole) return;
        const res = await fetch(`${api}/admin/roles`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ name: newRole })
        });
        if(res.ok) { setMsg({text: "Role Added", type: "success"}); setNewRole(""); loadRefData(); }
    };

    const updateRolePerms = async () => {
        if(!selectedRole) return;
        const res = await fetch(`${api}/admin/roles/${selectedRole.id}/permissions`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ permission_ids: rolePerms })
        });
        if(res.ok) { 
            setMsg({text: "Permissions Updated", type: "success"}); 
            setSelectedRole(null); 
            loadRefData(); 
        }
    };

    const openRoleConfig = (role: any) => {
        setSelectedRole(role);
        setRolePerms(role.permissions.map((p: any) => p.id));
    };
    
    const togglePerm = (id: number) => {
        if(rolePerms.includes(id)) {
            setRolePerms(rolePerms.filter(p => p !== id));
        } else {
            setRolePerms([...rolePerms, id]);
        }
    };

    return (
         <div className="space-y-6">
             {msg && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded shadow-lg border-l-4 transform transition-all duration-500 ease-in-out ${msg.type === 'success' ? 'bg-white border-green-500 text-green-700' : 'bg-white border-red-500 text-red-700'}`}>
                    <p className="font-medium">{msg.text}</p>
                </div>
            )}

            {/* Add User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">Create New User</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="Full Name" className="border p-2 rounded" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} />
                                <input placeholder="Phone" className="border p-2 rounded" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} />
                            </div>
                            <input placeholder="Email" className="border p-2 rounded w-full" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                            <input type="password" placeholder="Password" className="border p-2 rounded w-full" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                            
                            <div className="grid grid-cols-3 gap-4">
                                <select className="border p-2 rounded" value={newUser.role_id} onChange={e => setNewUser({...newUser, role_id: e.target.value})}>
                                    <option value="">Role...</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                                <select className="border p-2 rounded" value={newUser.location_id} onChange={e => setNewUser({...newUser, location_id: e.target.value})}>
                                    <option value="">Location...</option>
                                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                                <select className="border p-2 rounded" value={newUser.team_id} onChange={e => setNewUser({...newUser, team_id: e.target.value})}>
                                    <option value="">Team...</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-4">
                                <button onClick={() => setShowUserModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                                <button onClick={createUser} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create User</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Role Config Modal */}
            {selectedRole && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">Permissions: {selectedRole.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">Toggle access rights for this role.</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                            {permissions.map((p) => (
                                <label key={p.id} className="flex items-start gap-2 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={rolePerms.includes(p.id)} 
                                        onChange={() => togglePerm(p.id)}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-bold text-sm text-gray-800">{p.name}</div>
                                        <div className="text-xs text-gray-500">{p.description}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                        
                        <div className="flex justify-end gap-2">
                             <button onClick={() => setSelectedRole(null)} className="px-4 py-2 border rounded">Cancel</button>
                             <button onClick={updateRolePerms} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">Save Permissions</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
                        <h3 className="text-xl font-bold mb-4">Edit User: {editingUser.email}</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="Full Name" className="border p-2 rounded" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                                <input placeholder="Phone" className="border p-2 rounded" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">Role</label>
                                    <select className="w-full border p-2 rounded" value={editForm.role_id} onChange={e => setEditForm({...editForm, role_id: e.target.value})}>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">Location</label>
                                    <select className="w-full border p-2 rounded" value={editForm.location_id} onChange={e => setEditForm({...editForm, location_id: e.target.value})}>
                                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">Team</label>
                                    <select className="w-full border p-2 rounded" value={editForm.team_id} onChange={e => setEditForm({...editForm, team_id: e.target.value})}>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-4">
                                <button onClick={() => setEditingUser(null)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                                <button onClick={updateUser} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Password Reset Modal */}
            {resetId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-96">
                        <h3 className="text-lg font-bold mb-4">Reset Password</h3>
                        <input type="password" autoFocus placeholder="New Password" className="w-full border rounded p-2 mb-4" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                        <div className="flex justify-end gap-2">
                             <button onClick={() => { setResetId(null); setNewPass(""); }} className="px-4 py-2 border rounded">Cancel</button>
                             <button onClick={confirmReset} disabled={!newPass} className="px-4 py-2 bg-blue-600 text-white rounded">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex gap-4 border-b border-gray-200">
                <button onClick={() => setView('users')} className={`pb-2 px-1 ${view === 'users' ? 'border-b-2 border-blue-500 font-bold text-blue-600' : 'text-gray-500'}`}>User Directory</button>
                <button onClick={() => setView('roles')} className={`pb-2 px-1 ${view === 'roles' ? 'border-b-2 border-blue-500 font-bold text-blue-600' : 'text-gray-500'}`}>Roles & Permissions</button>
                <button onClick={() => setView('meta')} className={`pb-2 px-1 ${view === 'meta' ? 'border-b-2 border-blue-500 font-bold text-blue-600' : 'text-gray-500'}`}>Locations & Teams</button>
            </div>

            {view === 'users' && (
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">System Users</h2>
                            <p className="text-xs text-slate-500">{users.length} registered accounts</p>
                        </div>
                        <button onClick={() => setShowUserModal(true)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded shadow hover:bg-indigo-700">
                            + Add User
                        </button>
                     </div>
                    <table className="min-w-full text-sm">
                        <thead className="bg-white border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Identity</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Details</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(u => {
                                const isLocked = u.locked_until && (new Date(u.locked_until.endsWith('Z') ? u.locked_until : u.locked_until + 'Z').getTime() > Date.now());
                                return (
                                <tr key={u.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{u.email}</div>
                                        <div className="text-xs text-slate-500">{u.role.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-600">
                                        {u.location?.name} • {u.team?.name}
                                        <div className="text-gray-400">{u.full_name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {!u.is_active ? <span className="text-slate-500 font-bold text-xs bg-slate-100 px-2 py-1 rounded">Disabled</span>
                                        : isLocked ? <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded animate-pulse">Locked</span>
                                        : <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded">Active</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => startEditUser(u)} className="text-slate-600 font-bold text-xs hover:underline">Edit</button>
                                        <button onClick={() => setResetId(u.id)} className="text-indigo-600 font-bold text-xs hover:underline">Reset</button>
                                        {isLocked && (
                                            <button onClick={() => handleUnlock(u.id)} className="text-orange-600 font-bold text-xs border border-orange-200 px-2 py-1 rounded hover:bg-orange-50">Unlock</button>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            )}
            
            {view === 'roles' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                     <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Role Management</h2>
                            <p className="text-xs text-slate-500">Configure access rights for each role.</p>
                        </div>
                        <div className="flex gap-2">
                            <input className="border rounded px-2 py-1 text-sm" placeholder="New Role Name" value={newRole} onChange={e => setNewRole(e.target.value)} />
                            <button onClick={addRole} className="px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded">Add Role</button>
                        </div>
                     </div>
                     <table className="min-w-full text-sm">
                        <thead className="bg-white border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Role Name</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Permissions Count</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {roles.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-900">{r.name}</td>
                                    <td className="px-6 py-4 text-slate-600">{r.permissions.length} active permissions</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => openRoleConfig(r)} className="text-indigo-600 font-bold text-xs hover:underline">Configure Permissions</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {view === 'meta' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Locations */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-800 mb-4">Locations</h3>
                        <div className="flex gap-2 mb-4">
                            <input className="border rounded p-2 text-sm flex-1" placeholder="New Location Code (e.g. JP)" value={newLoc} onChange={e => setNewLoc(e.target.value)} />
                            <button onClick={addLocation} className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded">Add</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {locations.map(l => (
                                <span key={l.id} className="bg-slate-100 px-3 py-1 rounded text-sm font-medium text-slate-600">{l.name}</span>
                            ))}
                        </div>
                    </div>
                    
                    {/* Teams */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-800 mb-4">Teams</h3>
                        <div className="flex gap-2 mb-4">
                            <input className="border rounded p-2 text-sm flex-1" placeholder="New Team Code (e.g. SEC)" value={newTeam} onChange={e => setNewTeam(e.target.value)} />
                            <button onClick={addTeam} className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded">Add</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {teams.map(t => (
                                <span key={t.id} className="bg-slate-100 px-3 py-1 rounded text-sm font-medium text-slate-600">{t.name}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AuditViewer() {
    const [logs, setLogs] = useState<any[]>([]);
    const [filter, setFilter] = useState("");

     useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/admin/audit-logs`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }).then(r => r.json()).then(d => { if(Array.isArray(d)) setLogs(d); });
    }, []);
    
    const filteredLogs = logs.filter(l => 
        l.action.toLowerCase().includes(filter.toLowerCase()) || 
        l.details.toLowerCase().includes(filter.toLowerCase())
    );

    return (
         <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">Security Audit Trail</h2>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Filter logs..." 
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                    <div className="absolute left-3 top-2.5 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto border rounded-xl bg-slate-50 border-slate-200">
                <table className="min-w-full text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">Timestamp</th>
                            <th className="px-6 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">Action</th>
                            <th className="px-6 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredLogs.map(l => (
                            <tr key={l.id} className="bg-white hover:bg-slate-50 font-mono transition-colors">
                                <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-3 text-slate-800 font-bold">{l.action}</td>
                                <td className="px-6 py-3 text-slate-600 break-all">{l.details}</td>
                            </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                            <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">No logs found matching filter.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ReportsView() {
    const [stats, setStats] = useState({ 
        totalPatients: 0, 
        totalUsers: 0, 
        malePercentage: 0, 
        femalePercentage: 0,
        // Using "0-18", "19-35", "36-50", "51-70", "70+"
        ageGroups: { "0-18": 0, "19-35": 0, "36-50": 0, "51-70": 0, "70+": 0 } as Record<string, number>
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadData = async () => {
             const token = localStorage.getItem("token");
             try {
                 // Fetch aggregated stats from the secure backend endpoint
                 // This endpoint performs calculations server-side and does not expose PII
                 const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/patients/stats`, { 
                     headers: { Authorization: `Bearer ${token}` } 
                 });

                 if (!response.ok) {
                     if (response.status === 403) {
                         setError("You do not have permission to view reports.");
                     } else {
                         setError("Failed to load report data.");
                     }
                     setLoading(false);
                     return;
                 }

                 const data = await response.json();

                 setStats({
                     totalPatients: data.total_patients, 
                     totalUsers: data.total_users,
                     malePercentage: data.gender_distribution.male_percentage,
                     femalePercentage: data.gender_distribution.female_percentage,
                     ageGroups: data.age_groups
                 });
                 setLoading(false);
             } catch (e) { 
                 console.error(e); 
                 setError("Network error loading reports.");
                 setLoading(false);
             }
        };
        loadData();
    }, []);

    if (loading) return <div className="p-6 text-center text-slate-500">Loading reports...</div>;
    if (error) return <div className="p-6 text-center text-red-500 font-bold bg-red-50 rounded-lg">{error}</div>;

    const maxAgeCount = Math.max(...Object.values(stats.ageGroups), 1);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                     <div className="text-gray-500 text-sm font-bold uppercase">Total Patients</div>
                     <div className="text-4xl font-bold text-slate-800 mt-2">{stats.totalPatients.toLocaleString()}</div>
                     <div className="h-1 w-full mt-4 rounded bg-blue-500"></div>
                 </div>
                 <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                     <div className="text-gray-500 text-sm font-bold uppercase">System Users</div>
                     <div className="text-4xl font-bold text-slate-800 mt-2">{stats.totalUsers}</div>
                     <div className="h-1 w-full mt-4 rounded bg-green-500"></div>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Gender Distribution */}
                 <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-6">Patient Gender Distribution</h3>
                     <div className="flex items-center justify-center gap-8 py-8">
                         <div className="text-center">
                             <div className="text-3xl font-bold text-blue-600">{stats.malePercentage}%</div>
                             <div className="text-xs font-bold text-gray-500 uppercase mt-1">Male</div>
                         </div>
                         <div className="h-16 w-px bg-gray-200"></div>
                         <div className="text-center">
                             <div className="text-3xl font-bold text-pink-600">{stats.femalePercentage}%</div>
                             <div className="text-xs font-bold text-gray-500 uppercase mt-1">Female</div>
                         </div>
                     </div>
                     <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
                         <div className="h-full bg-blue-500" style={{ width: `${stats.malePercentage}%` }}></div>
                         <div className="h-full bg-pink-500" style={{ width: `${stats.femalePercentage}%` }}></div>
                     </div>
                 </div>

                 {/* Age Groups */}
                 <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-6">Patient Age Ratio</h3>
                    <div className="flex items-end h-48 gap-4 px-2 pb-2 border-b border-l border-slate-100">
                        {Object.entries(stats.ageGroups).map(([label, count]) => {
                            const pct = Math.round((count / (stats.totalPatients || 1)) * 100);
                            const height = Math.round((count / maxAgeCount) * 100);
                            return (
                                <div key={label} className="flex-1 flex flex-col justify-end group cursor-pointer relative h-full">
                                    <div className="w-full bg-indigo-50 border-t-4 border-indigo-500 rounded-t hover:bg-indigo-100 transition-colors" style={{ height: `${height}%` }}></div>
                                    <div className="absolute -top-10 w-full text-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <span className="bg-gray-800 text-white text-xs py-1 px-2 rounded">{count} ({pct}%)</span>
                                    </div>
                                    <div className="text-center mt-2 text-xs font-bold text-slate-500">{label}</div>
                                </div>
                            );
                        })}
                    </div>
                 </div>
            </div>
        </div>
    );
}
