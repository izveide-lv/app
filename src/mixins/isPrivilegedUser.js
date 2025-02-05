export default {
  computed: {
    isPrivilegedUser() {
      const { userInCurrentProject } = this.$store.getters;
      const { customRoles } = this.$store.state.currentProject;

      if (!userInCurrentProject) return false;

      let accessLevel = 'editor';
      if (userInCurrentProject.role === 'dev' || userInCurrentProject.role === 'owner') accessLevel = userInCurrentProject.role;
      else if (customRoles && customRoles.length > 0) {
        const customRole = customRoles.find((existingCustomRole) => existingCustomRole.value === userInCurrentProject.role);
        if (customRole) accessLevel = customRole.accessLevel;
      }

      return ['dev', 'owner'].includes(accessLevel);
    },
  },
};
