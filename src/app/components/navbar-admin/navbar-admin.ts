import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar-admin',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar-admin.html',
  styleUrls: ['./navbar-admin.css'],
})
export class NavbarAdmin {
protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/home']);
}
}
