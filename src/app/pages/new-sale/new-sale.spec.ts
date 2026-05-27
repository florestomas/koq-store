import { TestBed } from '@angular/core/testing';
import { NewSaleComponent } from './new-sale.component';

describe('NewSaleComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewSaleComponent],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(NewSaleComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render the title', () => {
    const fixture = TestBed.createComponent(NewSaleComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('NUEVA VENTA');
  });
});
