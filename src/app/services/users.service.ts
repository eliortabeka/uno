import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection,
} from 'angularfire2/firestore';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { BaseFirestoreService } from './base-firestore.service';
import { LocalStorageKeys } from '../constants/local-storage-keys';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class UsersService extends BaseFirestoreService {
  public userCollection: AngularFirestoreCollection<any>;
  public users$: Observable<any[]>;
  public path = 'users';

  constructor(firestore: AngularFirestore) {
    super();

    this.userCollection = firestore.collection(this.path);
    this.users$ = this.withId(this.userCollection);
  }

  public createUser(name?: string): Observable<User> {
    return this.addToCollection(this.userCollection, { name }).pipe(
      map((id) => new User(id, name))
    );
  }

  public authorize(): Observable<User> {
    let userId = localStorage.getItem(LocalStorageKeys.userId);

    if (userId) {
      return this.findById(userId).pipe(
        map((user) => new User(user.id, user.name))
      );
    }

    const name = prompt('Ваще имя: ');

    return this.createUser(name).pipe(
      tap((user) => localStorage.setItem(LocalStorageKeys.userId, user.id))
    );
  }

  public getByIds(userIds: string[]): Observable<User[]> {
    return this.users$.pipe(
      map((users) => users.filter((user) => userIds.includes(user.id)))
    );
  }

  public findById(userId: string): Observable<User> {
    return this.users$.pipe(
      map((users) => users.find((user) => user.id == userId))
    );
  }
}
