import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model

from .models import Conversation, Message, MessageReadReceipt

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if self.user is None or self.user.is_anonymous:
            await self.close()
            return

        self.user_group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.user_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "user_group_name"):
            await self.channel_layer.group_discard(self.user_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_text = text_data_json.get("message")
        conversation_id = text_data_json.get("conversation_id")

        if not message_text or not conversation_id:
            return

        saved_msg = await self.save_message(conversation_id, message_text)
        if not saved_msg:
            return

        participants = await self.get_participants(conversation_id)
        last_name = getattr(self.user, "last_name", "") or ""
        first_name = getattr(self.user, "first_name", "") or ""
        full_name = f"{last_name}{first_name}".strip()
        sender_display_name = full_name if full_name else self.user.username

        profile_picture = None
        if hasattr(self.user, "profile_picture") and self.user.profile_picture:
            try:
                profile_picture = self.user.profile_picture.url
            except Exception:
                pass

        for user_id in participants:
            await self.channel_layer.group_send(
                f"user_{user_id}",
                {
                    "type": "chat_message",
                    "id": saved_msg.id,
                    "text": saved_msg.text,
                    "sender": self.user.id,
                    "sender_name": sender_display_name,
                    "sender_profile_picture": profile_picture,
                    "conversation": conversation_id,
                    "read_by_ids": [self.user.id],
                    "created_at": saved_msg.created_at.isoformat(),
                },
            )

    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "id": event["id"],
                    "text": event["text"],
                    "sender": event["sender"],
                    "sender_name": event["sender_name"],
                    "sender_profile_picture": event.get("sender_profile_picture"),
                    "conversation": event["conversation"],
                    "read_by_ids": event.get("read_by_ids", []),
                    "created_at": event["created_at"],
                }
            )
        )

    async def messages_read(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "messages_read",
                    "conversation_id": event["conversation_id"],
                    "reader_id": event["reader_id"],
                }
            )
        )

    @database_sync_to_async
    def save_message(self, conversation_id, text):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            message = Message.objects.create(conversation=conversation, sender=self.user, text=text)
            MessageReadReceipt.objects.get_or_create(message=message, user=self.user)
            return message
        except Conversation.DoesNotExist:
            return None

    @database_sync_to_async
    def get_participants(self, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            return list(conversation.participants.values_list("id", flat=True))
        except Conversation.DoesNotExist:
            return []
