export default function hasAccess(activeUserEmail, users, customRoles) {
  const user = users.find((existingUser) => existingUser.email === activeUserEmail);

  if (!user) return false;

  let accessLevel = 'editor';
  if (user.role === 'dev' || user.role === 'owner') accessLevel = user.role;
  else if (customRoles && customRoles.length > 0) {
    const customRole = customRoles.find((existingCustomRole) => existingCustomRole.value === user.role);
    if (customRole) accessLevel = customRole.accessLevel;
  }

  return ['dev', 'owner'].includes(accessLevel);
}
