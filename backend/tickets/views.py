from bson.errors import InvalidId
from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import db
from .permissions import RolePermission
from .serializers import (
    LoginSerializer,
    SimilarityQuerySerializer,
    TicketSerializer,
    TicketUpdateSerializer,
)
from .services.similarity import find_similar, invalidate_cache


class TicketListCreateView(APIView):
    permission_classes = [RolePermission]

    def get(self, request):
        tickets = db.list_tickets(
            status=request.query_params.get("status"),
            category=request.query_params.get("category"),
        )
        return Response(tickets)

    def post(self, request):
        serializer = TicketSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = db.create_ticket(serializer.validated_data)
        if ticket["status"] == "Resolved":
            invalidate_cache()
        return Response(ticket, status=status.HTTP_201_CREATED)


class SimilarTicketsView(APIView):
    permission_classes = [RolePermission]

    def post(self, request):
        serializer = SimilarityQuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        response_data = find_similar(**serializer.validated_data)
        return Response(response_data)


class TicketDetailView(APIView):
    permission_classes = [RolePermission]
    agent_patch_only = True

    @staticmethod
    def valid_id(ticket_id):
        from bson import ObjectId

        try:
            ObjectId(ticket_id)
            return True
        except (InvalidId, TypeError):
            return False

    def get(self, request, ticket_id):
        if not self.valid_id(ticket_id):
            return Response({"detail": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)
        ticket = db.get_ticket(ticket_id)
        if ticket is None:
            return Response({"detail": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ticket)

    def patch(self, request, ticket_id):
        if not self.valid_id(ticket_id):
            return Response({"detail": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)
        existing = db.get_ticket(ticket_id)
        if existing is None:
            return Response({"detail": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = TicketUpdateSerializer(data=request.data, instance=existing)
        serializer.is_valid(raise_exception=True)
        updated = db.update_ticket(ticket_id, serializer.validated_data)
        if updated is not None and (
            existing["status"] == "Resolved" or updated["status"] == "Resolved"
        ):
            invalidate_cache()
        return Response(updated)


class TicketStatsView(APIView):
    permission_classes = [RolePermission]

    def get(self, request):
        return Response(db.get_ticket_stats())


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = db.get_user_by_username(serializer.validated_data["username"])
        if user is None or not check_password(
            serializer.validated_data["password"], user["password_hash"]
        ):
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response({
            "username": user["username"],
            "display_name": user["display_name"],
            "role": user["role"],
        })
