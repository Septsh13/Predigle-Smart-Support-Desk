from django.urls import include, path

from tickets.views import LoginView

urlpatterns = [
    path("api/login/", LoginView.as_view(), name="login"),
    path("api/tickets/", include("tickets.urls")),
]
