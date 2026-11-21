from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.permissions import BasePermission


class InvalidRole(APIException):
    status_code = 400
    default_detail = "Invalid role. Use 'user' or 'agent'."
    default_code = "invalid_role"


class RolePermission(BasePermission):
    """Validate demo role headers and reserve PATCH for support agents."""
    message = "Only support agents can update tickets."

    def has_permission(self, request, view):
        role = request.headers.get("X-Role", "user").strip().lower()
        if role not in ("user", "agent"):
            raise InvalidRole()
        request.support_role = role
        if getattr(view, "agent_patch_only", False) and request.method == "PATCH":
            if role != "agent":
                raise PermissionDenied(self.message)
        return True
