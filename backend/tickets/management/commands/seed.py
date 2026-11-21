from datetime import datetime, timedelta, timezone

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand

from tickets import db
from tickets.services.similarity import invalidate_cache


# Tuples are (status, category, title, description, resolution note).
SAMPLE_TICKETS = [
    ("Resolved", "Account", "Password reset link shows expired", "The recovery email link says it is no longer valid when I open it.", "Check the latest reset email only"),
    ("Resolved", "Account", "Reset email arrives after link timeout", "The password reset email arrives after its link has already timed out.", "Verify email delivery delay"),
    ("Resolved", "Account", "Email verification link expired", "My account verification link is no longer valid.", "Request a new verification email and use it within 15 minutes"),
    ("Resolved", "Account", "Unable to update profile photo", "Saving a new profile picture fails.", "Use a JPG or PNG under 2 MB"),
    ("Resolved", "Account", "Sign-in fails after updating account email", "After changing my account email, the old and new addresses both fail to sign in.", "Confirm the new email address and clear the old sign-in session"),
    ("Resolved", "Account", "Locked out after too many login attempts", "My account is locked after several failed sign-in attempts.", "Unlocked the account and confirmed the user could sign in"),
    ("Resolved", "Account", "Two-factor code not arriving", "I cannot receive the verification code by SMS.", "Updated the phone number and re-enabled two-factor delivery"),
    ("Resolved", "Account", "Duplicate user profile", "I seem to have two profiles using my email address.", "Merged the duplicate profile and kept its current account details"),
    ("Resolved", "Technical", "Dashboard stays blank", "The home page loads but shows no widgets.", "Rebuilt the dashboard cache and confirmed the widgets load"),
    ("Resolved", "Technical", "Reports screen hangs and becomes unresponsive", "Opening a report causes the page to freeze and stop responding.", "Cleared the report query cache and confirmed the screen responds"),
    ("Resolved", "Technical", "Report export fails", "Exporting a report returns an internal error.", "Corrected the export worker permissions and retried the report"),
    ("Resolved", "Technical", "Cannot upload attachment", "PDF attachments fail to upload at the final step.", "Raised the upload size limit and confirmed the PDF uploaded"),
    ("Resolved", "Technical", "Search returns no results", "Searching for an existing customer gives an empty list.", "Rebuilt the search index and confirmed the customer appears"),
    ("Resolved", "Technical", "API returns gateway error", "Requests intermittently fail with a 502 response.", "Restarted the affected service and corrected its health check"),
    ("Resolved", "Technical", "Notifications are delayed", "System alerts arrive several minutes after the event.", "Restarted the notification worker and verified delivery timing"),
    ("Resolved", "Technical", "Application crashes on launch", "The desktop app closes as soon as I open it.", "Repaired the local application configuration and confirmed startup"),
    ("Resolved", "Billing", "Duplicate payment on monthly plan", "I see two charges for the same monthly subscription.", "Refunded the duplicate subscription charge and emailed confirmation"),
    ("Resolved", "Billing", "Invoice amount is incorrect", "The latest invoice includes a charge I do not recognize.", "Removed the duplicate line item and issued a corrected invoice"),
    ("Resolved", "Billing", "Refund has not arrived", "I requested a refund but it is not visible on my card yet.", "Confirmed the refund was processed and shared the bank posting window"),
    ("Resolved", "Billing", "Card payment declined", "My card works elsewhere but payment fails here.", "Updated the payment processor configuration and confirmed payment"),
    ("Resolved", "Billing", "Tax number missing from invoice", "Our company tax number is absent from the latest invoice.", "Added the company tax number and issued a corrected invoice"),
    ("Resolved", "Billing", "Subscription cancellation confirmed", "Please confirm that my plan will not renew next month.", "Confirmed cancellation and sent the plan end date"),
    ("Resolved", "Other", "How do I contact support", "I need help finding the correct support channel.", "Shared support contact options and service hours"),
    ("Resolved", "Other", "Data import format question", "What spreadsheet format should I use to import records?", "Sent the import template and a link to the formatting guide"),
    ("Resolved", "Other", "Keyboard navigation accessibility issue", "I could not reach the save button using the keyboard.", "Fixed the focus order and verified keyboard navigation"),
    ("Resolved", "Other", "Request account data export", "I need a copy of the data stored in my account.", "Generated the account export and sent the secure download instructions"),
    ("Open", "Account", "Cannot reset password", "I requested a password reset, but the link in the email takes me to an expired-link page. I tried again and received the same result.", None),
    ("Open", "Billing", "Invoice download is empty", "The downloaded invoice PDF is blank.", None),
    ("Open", "Account", "Change account email", "Please update the email address on my profile.", None),
    ("Open", "Account", "Cannot sign out", "The logout button does not end my session.", None),
    ("Open", "Technical", "Page loading very slowly", "It takes over a minute to open the customer page.", None),
    ("Open", "Billing", "Update billing address", "The address printed on my invoice is outdated.", None),
    ("Open", "Other", "Request a product walkthrough", "Can someone show our team the main features?", None),
    ("Open", "Other", "Change notification preferences", "I receive too many email alerts.", None),
    ("Open", "Technical", "Suggest a new dashboard widget", "I would like a chart showing weekly activity.", None),
    ("In Progress", "Technical", "Dashboard fails to load", "The dashboard spinner never stops and the page never appears.", None),
    ("In Progress", "Account", "Merge two user profiles", "Please combine the records for two accounts belonging to one user.", None),
    ("In Progress", "Technical", "Search results are incomplete", "Some matching records are missing from search.", None),
    ("In Progress", "Technical", "Mobile layout overlaps", "Buttons cover the text on my phone screen.", None),
    ("In Progress", "Billing", "Payment declined unexpectedly", "A valid card is unexpectedly declined during checkout.", None),
    ("In Progress", "Billing", "Subscription tax details need correction", "The tax details on my subscription need to be updated.", None),
    ("In Progress", "Other", "Accessibility feedback", "The interface is difficult to use with keyboard navigation.", None),
]

DEMO_USERS = [
    *[
        {
            "username": f"user{number}",
            "display_name": f"User {number}",
            "role": "user",
            "password_hash": make_password("demo1234"),
        }
        for number in range(1, 7)
    ],
    *[
        {
            "username": f"agent{number}",
            "display_name": f"Support Agent {number}",
            "role": "agent",
            "password_hash": make_password("demo1234"),
        }
        for number in range(1, 7)
    ],
]


class Command(BaseCommand):
    help = "Insert 42 sample support tickets; use --reset to replace all tickets."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete all existing tickets before inserting the samples.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            deleted = db.delete_all_tickets()
            self.stdout.write(f"Deleted {deleted} existing tickets.")

        now = datetime.now(timezone.utc)
        inserted = 0
        updated = 0
        for index, (status, category, title, description, note) in enumerate(SAMPLE_TICKETS):
            ticket = {
                "status": status,
                "category": category,
                "title": title,
                "description": description,
                "created_at": now - timedelta(days=index % 30, hours=index % 24),
            }
            if note is not None:
                ticket["resolution_note"] = note
            if db.upsert_seed_ticket(ticket):
                inserted += 1
            else:
                updated += 1

        users_inserted = 0
        users_updated = 0
        for user in DEMO_USERS:
            if db.upsert_demo_user(user):
                users_inserted += 1
            else:
                users_updated += 1

        invalidate_cache()
        counts = db.get_ticket_status_counts()
        self.stdout.write(self.style.SUCCESS(
            f"Seed complete: {inserted} inserted, {updated} updated."
        ))
        self.stdout.write(
            "Final ticket counts: "
            f"{counts['Resolved']} Resolved / {counts['Open']} Open / "
            f"{counts['In Progress']} In Progress"
        )
        self.stdout.write(
            f"Demo accounts: {users_inserted} inserted, {users_updated} updated."
        )
