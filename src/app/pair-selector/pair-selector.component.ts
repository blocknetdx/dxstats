import {
  Component, ViewChild, ElementRef, EventEmitter,
  ViewChildren, QueryList, Output, OnInit, NgZone, AfterViewInit, ɵEMPTY_ARRAY
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { Subject } from 'rxjs/Subject';

import { AppService } from '../app.service';
import { fadeInOut } from '../animations';
import { TableComponent } from '../table/table.component';
import { TableColumnDirective } from '../table/table-column.directive';
import { CryptocurrencyService } from '../cryptocurrency.service';
import { Cryptocurrency } from '../cryptocurrency';
const { ipcRenderer } = window.electron;

@Component({
  selector: 'app-pair-selector',
  templateUrl: './pair-selector.component.html',
  styleUrls: ['./pair-selector.component.scss'],
  animations: [fadeInOut]
})
export class PairSelectorComponent implements OnInit, AfterViewInit {
  @ViewChild('pairTable') public pairTable: TableComponent;
  @ViewChild('submit') public submit: ElementRef;
  @ViewChild('pairForm') public pairForm: NgForm;
  @ViewChildren('input') public inputs: QueryList<ElementRef>;

  @Output('onActiveStatus')
  public onActiveStatus: EventEmitter<boolean> = new EventEmitter();

  public get symbols(): string[] {
    return this._loadedSymbols;
  }
  public get allCoins(): any[] {
    return this._allCoins;
  }
  public model: {coinPair?: any} = {coinPair: ''};
  public get sections(): any[] {
    let arr;
    arr = [
      {title: 'All Coins', rows: this._allCoins}
    ];
    return arr;
  }

  public comparisons: any[] = [];
  private _allCoins: any[];
  private _loadedSymbols: string[];
  private _controlStatus: Subject<boolean> = new Subject();

  private _state = 'stage1';
  public get state(): string { return this._state; }
  public set state(val: string) {
    this._state = val;
  }

  private _active: boolean;
  public get active(): boolean { return this._active; }
  public set active(val: boolean) {
    this._active = val;
    this.model = {};
    if (val) {
      setTimeout(() => {

      }, 0);
    } else {
      this.state = 'stage1';
      this._controlStatus.next(true);
    }
    this.onActiveStatus.emit(val);
  }
  ngOnInit() {
    ipcRenderer.on('activePairs', (e, currencies) => {
      this._allCoins = currencies;
    });

    ipcRenderer.on('setNewPair', (e, pair) => {
      console.log(pair);
      this._loadedSymbols = pair;
    });
  }
  ngAfterViewInit() {
    setTimeout(() => {
      const isFirstRun = window.electron.ipcRenderer.sendSync('isFirstRun');
      if(isFirstRun) this.active = true;
    }, 0);
  }
  onArrowDown(e) {
    if (e) e.preventDefault();
    this.pairTable.focusNextRow();
  }
  changePair(pair) {
    // console.log(this.model);
    // this.router.navigate(['/trading', `${a}-${b}`]);
    ipcRenderer.send('selectMarketPair', pair);
    // this.active = false;
  }
}
