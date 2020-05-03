import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseLocalStoreService } from './base-local-store.service';
import { LocalStorageCollection } from './local-storage-collection';
import { User } from '@models/user';

@Injectable({
  providedIn: 'root',
})
export class UsersApiService extends BaseLocalStoreService {
  public userCollection: LocalStorageCollection<any>;
  public users$: Observable<any[]>;
  public path = 'users';

  constructor() {
    super();

    this.userCollection = new LocalStorageCollection<any>(this.path);
    this.users$ = this.collectionChanges(this.path);
  }

  public createUser(name?: string): Observable<User> {
    return this.addToCollection(this.userCollection, { name }).pipe(
      map((id) => new User(id, name))
    );
  }

  public saveToken(userId: string, token: string) {
    const userRef = this.userCollection.doc(userId);
    const tokens = { [token]: true };
    userRef.update({ fcmTokens: tokens });
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

  public addOrUpdate(user: any): Promise<any> {
    return this.findById(user.id)
      ? this.userCollection.update(user.id, user)
      : this.userCollection.add(user).toPromise();
  }

  public update(user: User) {
    return this.userCollection.update(user.id, user);
  }

  public remove(userId: string) {
    return this.userCollection.remove(userId);
  }
}