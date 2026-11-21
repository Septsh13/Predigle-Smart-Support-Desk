import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-not-found',
  standalone: true,
  imports: [RouterLink],
  template: '<section class="placeholder-card"><h2>Page not found</h2><p>That page is not available.</p><a routerLink="/dashboard">Back to dashboard</a></section>',
  styles: ['.placeholder-card{padding:28px;border:1px solid var(--border);border-radius:12px;background:var(--surface);box-shadow:0 4px 14px rgba(46,16,101,.045)}h2{margin:0;color:var(--text);font-size:22px}p{color:var(--text-muted)}a{color:var(--purple-800);font-weight:700}']
})
export class PageNotFoundComponent {}
