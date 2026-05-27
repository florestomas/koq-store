import { TestBed } from '@angular/core/testing';
import { AlertasComponent } from './alertas.component';

describe('AlertasComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertasComponent],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(AlertasComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render the title', () => {
    const fixture = TestBed.createComponent(AlertasComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('ALERTAS DE STOCK');
  });
});
