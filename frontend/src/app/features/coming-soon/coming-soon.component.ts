import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  template: '<section class="placeholder-card"><p class="eyebrow">COMING SOON</p><h2>{{ title }}</h2><p>This section is not part of the current scope.</p></section>',
  styles: ['.placeholder-card{padding:28px;border:1px solid var(--border);border-radius:12px;background:var(--surface);box-shadow:0 4px 14px rgba(46,16,101,.045)}.eyebrow{margin:0 0 8px;color:var(--purple-700);font-size:10px;font-weight:800;letter-spacing:.14em}h2{margin:0;color:var(--text);font-size:22px}p:last-child{margin:9px 0 0;color:var(--text-muted)}']
})
export class ComingSoonComponent {
  readonly title = inject(ActivatedRoute).snapshot.data['title'] as string;
}
