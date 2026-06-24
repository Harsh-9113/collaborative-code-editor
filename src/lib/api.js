import { insforge } from "./insforge";

const unwrap = ({ data, error }, fallback = "Request failed") => {
  if (error) {
    throw new Error(error.message || fallback);
  }
  return data;
};

export const getProfile = async (userId) => {
  const result = await insforge.database.from("profiles").select("*").eq("id", userId);
  return unwrap(result, "Unable to load profile")?.[0] || null;
};

export const upsertProfile = async (user, values = {}) => {
  const payload = {
    id: user.id,
    email: user.email,
    display_name: values.display_name || user.name || user.email?.split("@")[0] || "New user",
    avatar_url: values.avatar_url || "",
    bio: values.bio || "",
  };

  const existing = await getProfile(user.id);
  if (existing) {
    return unwrap(
      await insforge.database.from("profiles").update(payload).eq("id", user.id),
      "Unable to update profile",
    );
  }

  return unwrap(
    await insforge.database.from("profiles").insert([payload]),
    "Unable to create profile",
  );
};

export const loadWorkspaces = async (userId) => {
  const memberships =
    unwrap(
      await insforge.database.from("workspace_members").select("*").eq("user_id", userId),
      "Unable to load memberships",
    ) || [];
  const workspaceIds = memberships.map((item) => item.workspace_id);

  if (!workspaceIds.length) return [];

  const workspaces =
    unwrap(
      await insforge.database.from("workspaces").select("*").in("id", workspaceIds),
      "Unable to load workspaces",
    ) || [];

  return workspaces.map((workspace) => ({
    ...workspace,
    membership: memberships.find((item) => item.workspace_id === workspace.id),
  }));
};

export const createWorkspace = async ({ name, description, userId }) => {
  const workspace = {
    id: crypto.randomUUID(),
    name,
    description,
    owner_id: userId,
  };

  const workspaceInsert = await insforge.database.from("workspaces").insert([workspace]);
  console.debug("createWorkspace workspace insert response", workspaceInsert);
  unwrap(workspaceInsert, "Unable to create workspace");

  if (!workspace?.id) {
    throw new Error("Workspace was created without an id.");
  }

  unwrap(
    await insforge.database.from("workspace_members").insert([
      { workspace_id: workspace.id, user_id: userId, role: "owner" },
    ]),
    "Unable to add workspace owner",
  );

  unwrap(
    await insforge.database.from("workspace_files").insert([
      {
        workspace_id: workspace.id,
        name: "index.html",
        language: "html",
        content:
          '<main>\n  <h1>Hello CollabCode</h1>\n  <p>Edit HTML, CSS, and JavaScript together.</p>\n</main>',
        created_by: userId,
      },
      {
        workspace_id: workspace.id,
        name: "styles.css",
        language: "css",
        content:
          "body {\n  font-family: Inter, system-ui, sans-serif;\n  padding: 32px;\n}\n\nh1 {\n  color: #2563eb;\n}",
        created_by: userId,
      },
      {
        workspace_id: workspace.id,
        name: "script.js",
        language: "javascript",
        content: 'console.log("Workspace ready");',
        created_by: userId,
      },
    ]),
    "Unable to create starter files",
  );

  return workspace;
};

export const deleteWorkspace = async (workspaceId) =>
  unwrap(
    await insforge.database.from("workspaces").delete().eq("id", workspaceId),
    "Unable to delete workspace",
  );

export const updateWorkspace = async (workspaceId, values) =>
  unwrap(
    await insforge.database.from("workspaces").update(values).eq("id", workspaceId),
    "Unable to update workspace",
  );

export const loadWorkspaceBundle = async (workspaceId) => {
  const [workspace, members, files, invitations] = await Promise.all([
    insforge.database.from("workspaces").select("*").eq("id", workspaceId),
    insforge.database.from("workspace_members").select("*").eq("workspace_id", workspaceId),
    insforge.database.from("workspace_files").select("*").eq("workspace_id", workspaceId),
    insforge.database.from("workspace_invitations").select("*").eq("workspace_id", workspaceId),
  ]);

  return {
    workspace: unwrap(workspace, "Unable to load workspace")?.[0] || null,
    members: unwrap(members, "Unable to load members") || [],
    files: unwrap(files, "Unable to load files") || [],
    invitations: unwrap(invitations, "Unable to load invitations") || [],
  };
};

export const loadProfiles = async (userIds) => {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return [];
  return (
    unwrap(
      await insforge.database.from("profiles").select("*").in("id", ids),
      "Unable to load profiles",
    ) || []
  );
};

export const loadInvitationsForEmail = async (email) =>
  unwrap(
    await insforge.database
      .from("workspace_invitations")
      .select("*")
      .eq("invited_email", email.toLowerCase())
      .eq("status", "pending"),
    "Unable to load invitations",
  ) || [];

export const createFile = async ({ workspaceId, name, language, userId, content = "" }) => {
  const file = {
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    name,
    language,
    content,
    created_by: userId,
  };

  unwrap(
    await insforge.database.from("workspace_files").insert([file]),
    "Unable to create file",
  );

  if (!file.id) {
    throw new Error("File was created without an id.");
  }

  return file;
};

export const updateFile = async (fileId, values) =>
  unwrap(
    await insforge.database.from("workspace_files").update(values).eq("id", fileId),
    "Unable to update file",
  );

export const deleteFile = async (fileId) =>
  unwrap(
    await insforge.database.from("workspace_files").delete().eq("id", fileId),
    "Unable to delete file",
  );

export const inviteUser = async ({ workspaceId, email, role, invitedBy }) =>
  unwrap(
    await insforge.database.from("workspace_invitations").insert([
      {
        workspace_id: workspaceId,
        invited_email: email.trim().toLowerCase(),
        role,
        invited_by: invitedBy,
      },
    ]),
    "Unable to invite user",
  );

export const updateInvitation = async (invitationId, values) =>
  unwrap(
    await insforge.database.from("workspace_invitations").update(values).eq("id", invitationId),
    "Unable to update invitation",
  );

export const acceptInvitation = async ({ invitation, userId }) => {
  await insforge.database.from("workspace_members").insert([
    { workspace_id: invitation.workspace_id, user_id: userId, role: invitation.role },
  ]);
  return updateInvitation(invitation.id, {
    status: "accepted",
    accepted_at: new Date().toISOString(),
  });
};

export const removeMember = async (memberId) =>
  unwrap(
    await insforge.database.from("workspace_members").delete().eq("id", memberId),
    "Unable to remove member",
  );

export const updateMember = async (memberId, values) =>
  unwrap(
    await insforge.database.from("workspace_members").update(values).eq("id", memberId),
    "Unable to update member",
  );
