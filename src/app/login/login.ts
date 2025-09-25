import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  error = signal<string | null>(null);

  constructor(private router: Router) {}

  login() {
    if (this.username === 'admin' && this.password === 'adminpass') {
      this.router.navigate(['/admin']);
    } else if (
      (this.username === 'staff1' && this.password === 'staffpass1') ||
      (this.username === 'staff2' && this.password === 'staffpass2')
    ) {
      this.router.navigate(['/staff']);
    } else {
      this.error.set('Invalid username or password.');
    }
  }
}
