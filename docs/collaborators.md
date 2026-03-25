# Collaborators

Collaborators allow verified users to work together on projects and journal entries. The feature is gated behind the `:collaborators` Flipper flag on a per-user basis.

## Data Model

**`Collaborator`** — polymorphic join table linking a user to either a `Project` or a `JournalEntry`. Hard-deleted (no soft-delete); paper_trail tracks audit history. Unique constraint on `[user_id, collaboratable_type, collaboratable_id]`.

**`CollaborationInvite`** — tracks the invite lifecycle for projects. Has a status enum: `pending`, `accepted`, `declined`, `revoked`. No unique constraint on `[project_id, invitee_id]` — re-invites after decline/revoke create new records. Only one pending invite per project+invitee is enforced via validation.

## Roles

There are three roles in the collaborator system:

| Role | Description |
|---|---|
| **Project owner** | The user who created the project (`project.user_id`). Has full control over the project and its collaborators. |
| **Project collaborator** | A verified user who accepted an invite. Can create journal entries on the project. Cannot edit/delete the project or manage invites. |
| **Journal entry author** | The user who created a specific journal entry (`journal_entry.user_id`). Owns that entry. |

A journal entry also has **credited collaborators** — other project participants (owner + collaborators) selected by the author when creating the entry. These are display-only and do not grant any additional access.

## Access Matrix

### Project

| Action | Owner | Collaborator | Outsider |
|---|---|---|---|
| View (listed) | Yes | Yes | Yes |
| View (unlisted) | Yes | Yes | No |
| Edit | Yes | No | No |
| Delete | Yes | No | No |
| Manage invites | Yes | No | No |
| Create journal entry | Yes | Yes | No |

### Journal Entry

| Action | Author (still on project) | Author (removed from project) | Other project participant | Outsider |
|---|---|---|---|---|
| View | Yes | Yes (they authored it) | Yes | No |
| Edit | Yes | No | No | No |
| Delete | Yes | No | No | No |

The key rule: **edit/delete require the author to currently be a project owner or collaborator.** Viewing only requires authorship OR current project membership.

### Invite

| Action | Inviter (owner) | Invitee | Other user |
|---|---|---|---|
| View invite page | Yes | Yes | No |
| Accept | No | Yes (if pending) | No |
| Decline | No | Yes (if pending) | No |
| Revoke | Yes (if pending) | No | No |

Admins can view and revoke any invite.

## Invite Flow

1. **Owner sends invite**: enters the invitee's email on the project page. The system looks up a verified, non-discarded user by that email. If not found, returns a generic "No verified user found" error (no PII leak). Creates a `CollaborationInvite` with status `pending`.

2. **Notification**: `MailDeliveryService.collaboration_invite_sent` creates a `MailMessage` for the invitee with `dismissable: false` (cannot be silently dismissed — forces action) and `action_url` pointing to `/collaboration_invites/:id`.

3. **Invitee responds**: clicks the mail notification, sees the invite page with Accept/Decline buttons.
   - **Accept**: status becomes `accepted`, a `Collaborator` record is created in a transaction, invitee is redirected to the project.
   - **Decline**: status becomes `declined`, invitee is redirected to their path.

4. **Owner revokes** (optional): owner can revoke a pending invite before the invitee responds. Status becomes `revoked`. If the invitee later clicks the mail link, they see "This invite was withdrawn."

## Validation Rules

- Only verified users can be invited (trial users are excluded)
- Owner cannot invite themselves
- Cannot create a duplicate pending invite for the same project+invitee
- Cannot invite someone who is already a collaborator on the project
- Re-invites after decline or revoke are allowed (creates a new record)

## Edge Cases

### Collaborator removed via console

There is no UI for removing collaborators. If a collaborator record is manually deleted via Rails console:

- The collaborator's journal entries **stay on the project** (they have their own `project_id` FK).
- The former collaborator **loses edit/delete access** on their journal entries because `JournalEntryPolicy#update?` and `#destroy?` check `record.project.owner_or_collaborator?(user)`.
- The former collaborator **can still view** their own journal entries (authorship grants view access via `owner?` check).
- The former collaborator **can no longer create** new journal entries on the project.
- The former collaborator **no longer sees** the project in their project list or journal entries by others on that project in their scope.
- The project owner **still sees** the former collaborator's entries on the project show page.

### Project deleted (soft-delete)

Projects use `Discardable` (soft-delete). When a project is discarded:

- `has_many :collaborators, dependent: :destroy` fires — collaborator records are hard-deleted.
- `has_many :collaboration_invites, dependent: :destroy` fires — invite records are hard-deleted.
- Journal entries are also destroyed via `dependent: :destroy`.
- The collaborator feature flag check (`collaborators_enabled?`) is unaffected — it's per-user, not per-project.

### User deleted (soft-delete)

When a user is discarded:

- `has_many :collaborations, dependent: :destroy` fires — their collaborator records are hard-deleted.
- `has_many :received_collaboration_invites, dependent: :destroy` fires — invites sent to them are hard-deleted.
- `has_many :sent_collaboration_invites, dependent: :destroy` fires — invites they sent are hard-deleted.
- Their journal entries on other projects remain (owned by `user_id` FK) but become inaccessible since the user can't log in.

### Feature flag disabled

When `:collaborators` is disabled for a user, the entire feature is inert. Gating is enforced at three layers:

- **Controller-level**: Both `CollaborationInvitesController` and `Projects::CollaborationInvitesController` block all actions via `require_collaborators_feature!`. The invite form doesn't render on the project show page. The project index doesn't show collaborated projects. The journal entry form doesn't show collaborator selection. The path page doesn't count collaborated projects in `has_projects`.
- **Policy-level**: All collaborator-dependent checks in `ProjectPolicy`, `JournalEntryPolicy`, and `CollaborationInvitePolicy` are gated by `collaborators_enabled?`. Even if a `Collaborator` record exists in the database (created while the flag was on), the policy will not grant access. Specifically:
  - Collaborators cannot create journal entries (`JournalEntryPolicy#create?` returns false).
  - Collaborators cannot see unlisted projects they're on (`ProjectPolicy#show?` falls back to listed/owner check).
  - Collaborators cannot edit/delete their own journal entries (`JournalEntryPolicy#update?`/`#destroy?` return false — but they can still **view** entries they authored).
  - Collaborated projects and their entries are excluded from policy scopes.
  - Invites cannot be viewed, accepted, declined, or revoked (`CollaborationInvitePolicy` returns false for all actions).
  - The project owner cannot manage collaborators (`ProjectPolicy#manage_collaborators?` returns false).
- **Model-level**: Validations (`owner_or_collaborator?`, `collaborator?`) do NOT check the feature flag. The flag check belongs at the controller/policy boundary, not in the data model. This means stale `Collaborator` records are harmless but not cleaned up — they simply have no effect while the flag is off.

### Invite for a non-existent email

Returns a generic "No verified user found with that email" error. Does not reveal whether the email exists in the system.

### Multiple pending invites

Prevented by validation. Only one pending invite per project+invitee can exist at a time. After a decline or revoke, a new invite can be created.

### Accepted invite, then re-invited

Prevented by validation. Cannot invite someone who is already a collaborator.

## Frontend Data Exposure

Only `display_name` and `avatar` are exposed for collaborators and invitees. No email addresses are sent to the frontend. The invite detail page shows the inviter's name/avatar, project name, and invite status.

## Feature Flag

The feature is gated by `Flipper.enabled?(:collaborators, current_user)`. Enable per-user at `/flipper` (admin-only dashboard).

```ruby
# Enable for a specific user
Flipper.enable(:collaborators, User.find(123))

# Enable for all users
Flipper.enable(:collaborators)

# Disable for a specific user
Flipper.disable(:collaborators, User.find(123))
```

The `collaborators_enabled?` helper is available in all controllers and views. The frontend receives `features.collaborators` via Inertia shared props.
