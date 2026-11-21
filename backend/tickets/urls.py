from django.urls import path

from .views import (
    SimilarTicketsView,
    TicketDetailView,
    TicketListCreateView,
    TicketStatsView,
)

urlpatterns = [
    path("similar/", SimilarTicketsView.as_view(), name="ticket-similar"),
    path("stats/", TicketStatsView.as_view(), name="ticket-stats"),
    path("", TicketListCreateView.as_view(), name="ticket-list-create"),
    path("<str:ticket_id>/", TicketDetailView.as_view(), name="ticket-detail"),
]
