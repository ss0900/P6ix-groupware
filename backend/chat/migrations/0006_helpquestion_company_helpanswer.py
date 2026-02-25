from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def backfill_helpquestion_company(apps, schema_editor):
    HelpQuestion = apps.get_model("chat", "HelpQuestion")
    UserMembership = apps.get_model("core", "UserMembership")

    for question in HelpQuestion.objects.filter(company__isnull=True).iterator():
        membership = (
            UserMembership.objects.filter(user_id=question.author_id, is_primary=True).first()
            or UserMembership.objects.filter(user_id=question.author_id).first()
        )
        if membership:
            question.company_id = membership.company_id
            question.save(update_fields=["company"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
        ("chat", "0005_messagereadreceipt"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="helpquestion",
            name="company",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="help_questions",
                to="core.company",
                verbose_name="회사",
            ),
        ),
        migrations.AddField(
            model_name="helpquestion",
            name="is_public",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(backfill_helpquestion_company, noop_reverse),
        migrations.CreateModel(
            name="HelpAnswer",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("content", models.TextField(verbose_name="내용")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="help_answers",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="작성자",
                    ),
                ),
                (
                    "question",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="answers",
                        to="chat.helpquestion",
                        verbose_name="질문",
                    ),
                ),
            ],
            options={
                "verbose_name": "도움말 답변",
                "verbose_name_plural": "도움말 답변",
                "ordering": ["created_at"],
            },
        ),
    ]
