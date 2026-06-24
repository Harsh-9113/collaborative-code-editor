import { Editor } from "@monaco-editor/react";
import {
  ArrowLeft,
  Braces,
  Code2,
  Eye,
  EyeOff,
  FileCode2,
  FileJson,
  FileText,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  acceptInvitation,
  createFile,
  createWorkspace,
  deleteFile,
  deleteWorkspace,
  inviteUser,
  loadInvitationsForEmail,
  loadProfiles,
  loadWorkspaceBundle,
  loadWorkspaces,
  removeMember,
  updateFile,
  updateInvitation,
  updateMember,
  updateWorkspace,
  upsertProfile,
} from "./lib/api";
import { insforge } from "./lib/insforge";
import { useAuth } from "./state/AuthContext";
import {
  buildPreviewDocument,
  FILE_TYPES,
  labelForLanguage,
  normalizeFileName,
  validateFileName,
} from "./utils/preview";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton = `${buttonBase} bg-blue-600 text-white hover:bg-blue-700`;
const subtleButton = `${buttonBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const dangerButton = `${buttonBase} bg-red-600 text-white hover:bg-red-700`;
const inputBase =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const editorLanguageForFile = (language) => {
  if (language === "txt") return "plaintext";
  return language;
};

const starterContentForLanguage = (language) => {
  if (language === "html") return "<main>\n  <h1>New file</h1>\n</main>";
  if (language === "css") return "body {\n  margin: 0;\n}";
  if (language === "javascript") return 'console.log("New file");';
  if (language === "json") return "{\n  \n}";
  return "";
};

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenStatus text="Loading session..." />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function FullScreenStatus({ text }) {
  return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-600">{text}</div>;
}

function Toast({ toast, onClose }) {
  if (!toast) return null;

  const tone =
    toast.type === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <div className={`fixed right-4 top-20 z-50 max-w-sm rounded-md border px-4 py-3 text-sm shadow-lg ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="flex-1">{toast.message}</span>
        <button className="rounded p-1 hover:bg-black/5" onClick={onClose} aria-label="Close notification">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function FileDialog({ mode, files, file, onClose, onSubmit, busy }) {
  const [name, setName] = useState(file?.name || "");
  const [language, setLanguage] = useState(file?.language || "html");
  const validation = validateFileName(name, language, files, file?.id);
  const title = mode === "rename" ? "Rename file" : "New file";

  useEffect(() => {
    setName(file?.name || "");
    setLanguage(file?.language || "html");
  }, [file, mode]);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 px-4">
      <form
        className="w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (validation.error) return;
          onSubmit({ name: validation.fileName, language });
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="mt-5 block text-sm font-medium text-slate-700">
          File name
          <input
            className={`${inputBase} mt-1`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="index"
            autoFocus
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          File type
          <select
            className={`${inputBase} mt-1`}
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            {FILE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-slate-500">Final name: {validation.fileName || normalizeFileName(name, language)}</p>
        {validation.error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{validation.error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={subtleButton} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={primaryButton} disabled={busy || Boolean(validation.error)}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "rename" ? "Rename" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDialog({ file, onClose, onConfirm, busy }) {
  if (!file) return null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 px-4">
      <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">Delete file</h2>
          <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Delete <span className="font-medium text-slate-950">{file.name}</span>? This removes it from the workspace for every member.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className={subtleButton} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={dangerButton} onClick={onConfirm} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function AppShell({ children }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-slate-950">
            <Code2 className="h-5 w-5 text-blue-600" />
            CollabCode
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/profile" className="hidden text-sm text-slate-600 hover:text-slate-950 sm:block">
              {profile?.display_name || "Profile"}
            </Link>
            <button
              className={subtleButton}
              onClick={async () => {
                await logout();
                navigate("/");
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

function LandingPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <Code2 className="h-6 w-6 text-cyan-300" />
          CollabCode
        </div>
        <div className="flex gap-2">
          <Link className="rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-white/10" to="/login">
            Login
          </Link>
          <Link className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950" to="/signup">
            Sign up
          </Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">InsForge + PostgreSQL</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-white md:text-7xl">
            Collaborative Code Editor
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Create workspaces, invite editors, build HTML/CSS/JS files in Monaco, and preview changes as your team edits in real time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-md bg-cyan-300 px-5 py-3 font-semibold text-slate-950" to={user ? "/dashboard" : "/signup"}>
              Open dashboard
            </Link>
            <Link className="rounded-md border border-white/20 px-5 py-3 font-semibold text-white hover:bg-white/10" to="/login">
              Login
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-md border border-white/10 bg-slate-900 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-300" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-3 text-xs text-slate-400">workspace/index.html</span>
          </div>
          <pre className="min-h-80 overflow-hidden p-6 text-sm leading-7 text-slate-300">
            <code>{`<main class="studio">
  <h1>Build together</h1>
  <button id="run">Preview</button>
</main>

.studio {
  display: grid;
  gap: 16px;
}

run.onclick = () => {
  console.log("Live sync");
};`}</code>
          </pre>
        </div>
      </section>
    </div>
  );
}

function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const { login, signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isSignup) await signUp(form);
      else await login(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <Link to="/" className="mb-8 flex items-center gap-2 font-semibold text-slate-950">
          <Code2 className="h-5 w-5 text-blue-600" />
          CollabCode
        </Link>
        <h1 className="text-2xl font-semibold text-slate-950">{isSignup ? "Create account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {isSignup ? "Start a shared coding workspace." : "Continue to your workspaces."}
        </p>
        <div className="mt-6 space-y-4">
          {isSignup && (
            <label className="block text-sm font-medium text-slate-700">
              Name
              <input className={`${inputBase} mt-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input className={`${inputBase} mt-1`} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input className={`${inputBase} mt-1`} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </label>
        </div>
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className={`${primaryButton} mt-6 w-full`} disabled={busy}>{busy ? "Working..." : isSignup ? "Sign up" : "Login"}</button>
        <p className="mt-5 text-center text-sm text-slate-500">
          {isSignup ? "Already have an account?" : "Need an account?"}{" "}
          <Link className="font-medium text-blue-600" to={isSignup ? "/login" : "/signup"}>
            {isSignup ? "Login" : "Sign up"}
          </Link>
        </p>
      </form>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");

  const refresh = async () => {
    setWorkspaces(await loadWorkspaces(user.id));
    setInvitations(await loadInvitationsForEmail(user.email));
  };

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, [user.id]);

  const submit = async (event) => {
    event.preventDefault();
    const workspace = await createWorkspace({ ...form, userId: user.id });
    navigate(`/workspaces/${workspace.id}`);
  };

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">Workspaces</h1>
              <p className="mt-1 text-sm text-slate-500">Create, open, and remove collaborative coding rooms.</p>
            </div>
          </div>
          {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace) => (
              <article key={workspace.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-950">{workspace.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{workspace.description || "No description"}</p>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{workspace.membership?.role}</span>
                </div>
                <div className="mt-5 flex gap-2">
                  <Link className={primaryButton} to={`/workspaces/${workspace.id}`}>
                    <FileCode2 className="h-4 w-4" />
                    Open
                  </Link>
                  {workspace.membership?.role === "owner" && (
                    <button className={subtleButton} onClick={async () => { await deleteWorkspace(workspace.id); refresh(); }}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
        <aside className="space-y-4">
          <form onSubmit={submit} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-950">New workspace</h2>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Name
              <input className={`${inputBase} mt-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Description
              <textarea className={`${inputBase} mt-1 min-h-24`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <button className={`${primaryButton} mt-4 w-full`}>
              <Plus className="h-4 w-4" />
              Create
            </button>
          </form>
          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-950">Invitations</h2>
            <div className="mt-3 space-y-3">
              {invitations.length === 0 && <p className="text-sm text-slate-500">No pending invitations.</p>}
              {invitations.map((invite) => (
                <div key={invite.id} className="rounded-md bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-800">Workspace invite</p>
                  <button className={`${primaryButton} mt-3 w-full`} onClick={async () => { await acceptInvitation({ invitation: invite, userId: user.id }); refresh(); }}>
                    Accept
                  </button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function WorkspacePage() {
  const { workspaceId } = useParams();
  const { user, profile } = useAuth();
  const [bundle, setBundle] = useState({ workspace: null, files: [], members: [], invitations: [] });
  const [activeFileId, setActiveFileId] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [online, setOnline] = useState({});
  const [cursors, setCursors] = useState({});
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState(null);
  const [fileDialog, setFileDialog] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loadingAction, setLoadingAction] = useState("");
  const channel = `workspace:${workspaceId}`;
  const suppressPublish = useRef(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const refresh = async () => {
    const next = await loadWorkspaceBundle(workspaceId);
    setBundle(next);
    setActiveFileId((current) =>
      next.files.some((file) => file.id === current) ? current : next.files[0]?.id || "",
    );
  };

  useEffect(() => {
    refresh().catch((err) => setStatus(err.message));
  }, [workspaceId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let timer;
    let mounted = true;
    const connect = async () => {
      await insforge.realtime.connect();
      await insforge.realtime.subscribe(channel);
      insforge.realtime.on("file-change", (payload) => {
        if (!mounted || payload.userId === user.id) return;
        suppressPublish.current = true;
        setBundle((current) => ({
          ...current,
          files: current.files.map((file) => (file.id === payload.fileId ? { ...file, content: payload.content } : file)),
        }));
      });
      insforge.realtime.on("file-meta", (payload) => {
        if (!mounted || payload.userId === user.id) return;
        refresh();
      });
      insforge.realtime.on("presence", (payload) => {
        if (!mounted) return;
        setOnline((current) => ({ ...current, [payload.userId]: { ...payload, seenAt: Date.now() } }));
      });
      insforge.realtime.on("cursor", (payload) => {
        if (!mounted || payload.userId === user.id) return;
        setCursors((current) => ({ ...current, [payload.userId]: payload }));
      });
      timer = setInterval(() => {
        insforge.realtime.publish(channel, "presence", {
          userId: user.id,
          name: profile?.display_name || user.email,
          email: user.email,
        });
        setOnline((current) =>
          Object.fromEntries(Object.entries(current).filter(([, item]) => Date.now() - item.seenAt < 12000)),
        );
      }, 4000);
    };
    connect().catch(() => {});
    return () => {
      mounted = false;
      clearInterval(timer);
      insforge.realtime.unsubscribe(channel);
      insforge.realtime.disconnect();
    };
  }, [channel, user.id, profile?.display_name]);

  const activeFile = bundle.files.find((file) => file.id === activeFileId) || bundle.files[0];
  const preview = useMemo(() => buildPreviewDocument(bundle.files), [bundle.files]);

  const changeContent = (content) => {
    if (!activeFile) return;
    setBundle((current) => ({
      ...current,
      files: current.files.map((file) => (file.id === activeFile.id ? { ...file, content } : file)),
    }));
    if (!suppressPublish.current) {
      insforge.realtime.publish(channel, "file-change", { userId: user.id, fileId: activeFile.id, content });
    }
    suppressPublish.current = false;
  };

  const save = async () => {
    if (!activeFile) return;
    setLoadingAction("save");
    try {
      await updateFile(activeFile.id, { content: activeFile.content });
      setStatus("Saved");
      showToast(`${activeFile.name} saved.`);
      setTimeout(() => setStatus(""), 1600);
    } catch (err) {
      showToast(err.message || "Unable to save file.", "error");
    } finally {
      setLoadingAction("");
    }
  };

  const handleCreateFile = async ({ name, language }) => {
    setLoadingAction("create-file");
    try {
      const file = await createFile({
        workspaceId,
        name,
        language,
        content: starterContentForLanguage(language),
        userId: user.id,
      });
      setBundle((current) => ({ ...current, files: [...current.files, file] }));
      setActiveFileId(file.id);
      setFileDialog(null);
      showToast(`${file.name} created.`);
      insforge.realtime.publish(channel, "file-meta", { userId: user.id });
    } catch (err) {
      showToast(err.message || "Unable to create file.", "error");
    } finally {
      setLoadingAction("");
    }
  };

  const handleRenameFile = async ({ name, language }) => {
    const file = fileDialog?.file;
    if (!file) return;
    setLoadingAction("rename-file");
    try {
      await updateFile(file.id, { name, language });
      setBundle((current) => ({
        ...current,
        files: current.files.map((item) => (item.id === file.id ? { ...item, name, language } : item)),
      }));
      setFileDialog(null);
      showToast(`${name} renamed.`);
      insforge.realtime.publish(channel, "file-meta", { userId: user.id });
    } catch (err) {
      showToast(err.message || "Unable to rename file.", "error");
    } finally {
      setLoadingAction("");
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteTarget) return;
    setLoadingAction("delete-file");
    try {
      await deleteFile(deleteTarget.id);
      setBundle((current) => {
        const nextFiles = current.files.filter((file) => file.id !== deleteTarget.id);
        if (activeFileId === deleteTarget.id) {
          setActiveFileId(nextFiles[0]?.id || "");
        }
        return { ...current, files: nextFiles };
      });
      showToast(`${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      insforge.realtime.publish(channel, "file-meta", { userId: user.id });
    } catch (err) {
      showToast(err.message || "Unable to delete file.", "error");
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />
      {fileDialog && (
        <FileDialog
          mode={fileDialog.mode}
          files={bundle.files}
          file={fileDialog.file}
          onClose={() => setFileDialog(null)}
          onSubmit={fileDialog.mode === "rename" ? handleRenameFile : handleCreateFile}
          busy={loadingAction === "create-file" || loadingAction === "rename-file"}
        />
      )}
      <ConfirmDialog
        file={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteFile}
        busy={loadingAction === "delete-file"}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link className={subtleButton} to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-950">{bundle.workspace?.name || "Workspace"}</h1>
            <p className="text-sm text-slate-500">{Object.keys(online).length + 1} online · {status || "Ready"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={subtleButton} onClick={() => setShowPreview((value) => !value)}>
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            Preview
          </button>
          <button className={primaryButton} onClick={save} disabled={!activeFile || loadingAction === "save"}>
            {loadingAction === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
          <Link className={subtleButton} to={`/workspaces/${workspaceId}/members`}><Users className="h-4 w-4" />Members</Link>
          <Link className={subtleButton} to={`/workspaces/${workspaceId}/settings`}><Settings className="h-4 w-4" /></Link>
        </div>
      </div>
      <div className={`grid gap-4 ${showPreview ? "xl:grid-cols-[220px_1fr_42%]" : "xl:grid-cols-[220px_1fr]"}`}>
        <FileSidebar
          files={bundle.files}
          activeFileId={activeFile?.id}
          onSelect={setActiveFileId}
          onCreate={() => setFileDialog({ mode: "create" })}
          onRename={(file) => setFileDialog({ mode: "rename", file })}
          onDelete={setDeleteTarget}
        />
        <section className="overflow-hidden rounded-md border border-slate-200 bg-slate-950 shadow-sm">
          {activeFile ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-white">{activeFile.name}</span>
                  <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
                    {labelForLanguage(activeFile.language)}
                  </span>
                </div>
              </div>
              <Editor
                height="68vh"
                theme="vs-dark"
                language={editorLanguageForFile(activeFile.language)}
                value={activeFile.content}
                onChange={(value) => changeContent(value || "")}
                onMount={(editor) => {
                  editor.onDidChangeCursorPosition((event) => {
                    insforge.realtime.publish(channel, "cursor", {
                      userId: user.id,
                      name: profile?.display_name || user.email,
                      fileId: activeFile.id,
                      line: event.position.lineNumber,
                      column: event.position.column,
                    });
                  });
                }}
                options={{ minimap: { enabled: false }, fontSize: 14, tabSize: 2, wordWrap: "on" }}
              />
            </>
          ) : (
            <div className="grid h-96 place-items-center text-sm text-slate-400">Create a file to start editing.</div>
          )}
        </section>
        {showPreview && (
          <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Live preview</div>
            <iframe title="Live preview" className="h-[68vh] w-full bg-white" srcDoc={preview} sandbox="allow-scripts" />
          </section>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[{ userId: user.id, name: profile?.display_name || user.email }, ...Object.values(online)].map((item) => (
          <span key={item.userId} className="rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{item.name}</span>
        ))}
        {Object.values(cursors).map((cursor) => (
          <span key={cursor.userId} className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
            {cursor.name}: line {cursor.line}, col {cursor.column}
          </span>
        ))}
      </div>
    </AppShell>
  );
}

function FileIcon({ language }) {
  const className = "h-4 w-4 shrink-0";
  if (language === "json") return <FileJson className={`${className} text-amber-500`} />;
  if (language === "txt") return <FileText className={`${className} text-slate-500`} />;
  if (language === "javascript") return <Braces className={`${className} text-yellow-500`} />;
  return <FileCode2 className={`${className} text-blue-500`} />;
}

function FileSidebar({ files, activeFileId, onSelect, onCreate, onRename, onDelete }) {
  const groupedFiles = FILE_TYPES.map((type) => ({
    ...type,
    files: files.filter((file) => file.language === type.value),
  })).filter((group) => group.files.length > 0);

  return (
    <aside className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-950">Files</h2>
        <button className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" />
          New File
        </button>
      </div>
      <div className="space-y-4">
        {groupedFiles.length === 0 && (
          <div className="rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-500">
            No files yet.
          </div>
        )}
        {groupedFiles.map((group) => (
          <div key={group.value}>
            <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.files.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 ${
                    activeFileId === file.id ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <button className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm" onClick={() => onSelect(file.id)}>
                    <FileIcon language={file.language} />
                    <span className="truncate">{file.name}</span>
                  </button>
                  <button
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => onRename(file)}
                    aria-label={`Rename ${file.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => onDelete(file)}
                    aria-label={`Delete ${file.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function MembersPage() {
  const { workspaceId } = useParams();
  const [bundle, setBundle] = useState({ members: [], invitations: [] });
  const [profiles, setProfiles] = useState([]);

  const refresh = async () => {
    const next = await loadWorkspaceBundle(workspaceId);
    setBundle(next);
    setProfiles(await loadProfiles(next.members.map((member) => member.user_id)));
  };

  useEffect(() => {
    refresh();
  }, [workspaceId]);

  const profileFor = (userId) => profiles.find((profile) => profile.id === userId);

  return (
    <AppShell>
      <PageHeader title="Members" back={`/workspaces/${workspaceId}`} actions={<Link className={primaryButton} to={`/workspaces/${workspaceId}/invite`}><UserPlus className="h-4 w-4" />Invite</Link>} />
      <section className="rounded-md border border-slate-200 bg-white shadow-sm">
        {bundle.members.map((member) => {
          const memberProfile = profileFor(member.user_id);
          return (
            <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
              <div>
                <p className="font-medium text-slate-950">{memberProfile?.display_name || memberProfile?.email || member.user_id}</p>
                <p className="text-sm text-slate-500">{memberProfile?.email}</p>
              </div>
              <div className="flex gap-2">
                <select className={inputBase} value={member.role} disabled={member.role === "owner"} onChange={(e) => updateMember(member.id, { role: e.target.value }).then(refresh)}>
                  <option value="owner">Owner</option>
                  <option value="editor">Editor</option>
                </select>
                {member.role !== "owner" && <button className={dangerButton} onClick={() => removeMember(member.id).then(refresh)}><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>
          );
        })}
      </section>
      <section className="mt-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-950">Pending invitations</h2>
        <div className="mt-3 space-y-2">
          {bundle.invitations.filter((item) => item.status === "pending").map((invite) => (
            <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm">
              <span>{invite.invited_email}</span>
              <button className={subtleButton} onClick={() => updateInvitation(invite.id, { status: "revoked" }).then(refresh)}>Revoke</button>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function InvitePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  return (
    <AppShell>
      <PageHeader title="Invite user" back={`/workspaces/${workspaceId}/members`} />
      <form
        className="max-w-lg rounded-md border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await inviteUser({ workspaceId, email, role: "editor", invitedBy: user.id });
            navigate(`/workspaces/${workspaceId}/members`);
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input className={`${inputBase} mt-1`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Role
          <select className={`${inputBase} mt-1`} value="editor" disabled><option>Editor</option></select>
        </label>
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className={`${primaryButton} mt-5`}><UserPlus className="h-4 w-4" />Send invite</button>
      </form>
    </AppShell>
  );
}

function WorkspaceSettingsPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);

  useEffect(() => {
    loadWorkspaceBundle(workspaceId).then((bundle) => setWorkspace(bundle.workspace));
  }, [workspaceId]);

  if (!workspace) return <AppShell><FullScreenStatus text="Loading workspace..." /></AppShell>;

  return (
    <AppShell>
      <PageHeader title="Workspace settings" back={`/workspaces/${workspaceId}`} />
      <form
        className="max-w-2xl rounded-md border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          await updateWorkspace(workspaceId, { name: workspace.name, description: workspace.description });
          navigate(`/workspaces/${workspaceId}`);
        }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input className={`${inputBase} mt-1`} value={workspace.name} onChange={(e) => setWorkspace({ ...workspace, name: e.target.value })} />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Description
          <textarea className={`${inputBase} mt-1 min-h-28`} value={workspace.description} onChange={(e) => setWorkspace({ ...workspace, description: e.target.value })} />
        </label>
        <button className={`${primaryButton} mt-5`}><Save className="h-4 w-4" />Save settings</button>
      </form>
    </AppShell>
  );
}

function ProfilePage() {
  const { user, profile, refreshUser } = useAuth();
  const [form, setForm] = useState({ display_name: "", avatar_url: "", bio: "" });

  useEffect(() => {
    if (profile) setForm({ display_name: profile.display_name || "", avatar_url: profile.avatar_url || "", bio: profile.bio || "" });
  }, [profile]);

  return (
    <AppShell>
      <PageHeader title="User profile" back="/dashboard" />
      <form
        className="max-w-2xl rounded-md border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          await upsertProfile(user, form);
          await insforge.auth.setProfile({ displayName: form.display_name, bio: form.bio, avatarUrl: form.avatar_url });
          await refreshUser();
        }}
      >
        <label className="block text-sm font-medium text-slate-700">Email<input className={`${inputBase} mt-1`} value={user.email} disabled /></label>
        <label className="mt-4 block text-sm font-medium text-slate-700">Display name<input className={`${inputBase} mt-1`} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></label>
        <label className="mt-4 block text-sm font-medium text-slate-700">Avatar URL<input className={`${inputBase} mt-1`} value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} /></label>
        <label className="mt-4 block text-sm font-medium text-slate-700">Bio<textarea className={`${inputBase} mt-1 min-h-28`} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
        <button className={`${primaryButton} mt-5`}><Save className="h-4 w-4" />Save profile</button>
      </form>
    </AppShell>
  );
}

function PageHeader({ title, back, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link className={subtleButton} to={back}><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
      </div>
      {actions}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/settings" element={<ProtectedRoute><WorkspaceSettingsPage /></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/invite" element={<ProtectedRoute><InvitePage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
