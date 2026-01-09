from django.urls import path
from .views import auth_view, belong_view

app_name = 'core'

urlpatterns = [
    path('auth/login/', auth_view.CustomLoginView.as_view(), name='custom-login'),
    path('auth/logout/', auth_view.LogoutView.as_view(), name='logout'),
    path("profile/", auth_view.UserProfileView.as_view(), name="user-profile"),

    path("membership/me/", auth_view.UserMembershipMeView.as_view(), name="membership-me"),
]

# 소속 belonging
urlpatterns += [
    path("companies/", belong_view.CompanyViewSet.as_view({"get": "list", "post": "create"}), name="companies-list"),
    path("companies/<int:pk>/", belong_view.CompanyViewSet.as_view({
        "get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"
    }), name="companies-detail"),

    path("departments/", belong_view.DepartmentViewSet.as_view({"get": "list", "post": "create"}), name="departments-list"),
    path("departments/<int:pk>/", belong_view.DepartmentViewSet.as_view({
        "get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"
    }), name="departments-detail"),

    path("positions/", belong_view.PositionViewSet.as_view({"get": "list", "post": "create"}), name="positions-list"),
    path("positions/<int:pk>/", belong_view.PositionViewSet.as_view({
        "get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"
    }), name="positions-detail"),
]