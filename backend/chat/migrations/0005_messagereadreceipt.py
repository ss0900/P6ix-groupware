from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0004_remove_conversation_project"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="MessageReadReceipt",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("read_at", models.DateTimeField(auto_now_add=True, verbose_name="Read At")),
                ("message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="read_receipts", to="chat.message", verbose_name="Message")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_message_read_receipts", to=settings.AUTH_USER_MODEL, verbose_name="User")),
            ],
            options={
                "verbose_name": "Message Read Receipt",
                "verbose_name_plural": "Message Read Receipts",
                "ordering": ["-read_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="messagereadreceipt",
            constraint=models.UniqueConstraint(fields=("message", "user"), name="uniq_chat_message_read_receipt"),
        ),
    ]
