from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from core.serializers import (
    LoginSerializer, LogoutSerializer, UserSerializer,
    UserMembershipReadSerializer, UserMembershipWriteSerializer,
)
from core.models import UserMembership

# 로그인 (JWT 토큰 발급)
class CustomLoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        tokens = serializer.save()   # access, refresh 토큰 발급
        return Response(tokens, status=status.HTTP_200_OK)

# 로그아웃 (Refresh 토큰 무효화)
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            refresh_token = serializer.validated_data["refresh"]
            token = RefreshToken(refresh_token)
            # token_blacklist 앱이 없거나 설정이 다르면 예외가 날 수 있음
            try:
                token.blacklist()
            except Exception:
                # MVP에서는 "로그아웃 처리 완료"로 보고 넘어가도 됨
                pass
            return Response({"detail": "로그아웃 되었습니다."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

# 사용자 본인 프로필 조회 및 수정
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "프로필 수정 완료", "user": serializer.data}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 내 소속(대표소속 1개 + 겸직) 조회/추가/변경
class UserMembershipMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            UserMembership.objects
            .filter(user=request.user)
            .select_related("company", "department", "position")
            .order_by("-is_primary", "-created_at")
        )
        return Response(UserMembershipReadSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        # 새 멤버십 생성(겸직 추가 가능)
        serializer = UserMembershipWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(user=request.user)
        out = UserMembershipReadSerializer(instance).data
        return Response(out, status=status.HTTP_201_CREATED)

    def put(self, request):
        # 주 소속 변경: membership_id를 받아 해당 멤버십을 수정
        membership_id = request.data.get("id")
        if not membership_id:
            return Response({"error": "id(membership_id)가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            instance = UserMembership.objects.get(id=membership_id, user=request.user)
        except UserMembership.DoesNotExist:
            return Response({"error": "해당 소속을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UserMembershipWriteSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(user=request.user)
        out = UserMembershipReadSerializer(instance).data
        return Response(out, status=status.HTTP_200_OK)