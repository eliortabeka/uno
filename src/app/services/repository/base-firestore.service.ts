import {
  AngularFirestoreCollection,
  AngularFirestoreDocument,
  DocumentChangeAction,
  DocumentSnapshot,
  Action,
  DocumentChangeType,
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export class BaseFirestoreService {
  protected collectionChanges<T>(
    collection: AngularFirestoreCollection<T>,
    changeTypes?: DocumentChangeType[],
    logItems = false,
    logChanges = false
  ): Observable<T[]> {
    return collection.snapshotChanges(changeTypes).pipe(
      tap(() => console.log(`list path: ${collection.ref.path}`)),
      tap((changes: DocumentChangeAction<T>[]) => {
        logChanges &&
          console.log(
            `${collection.ref.path}`,
            changes.map((change) => change.type)
          );
      }),
      map((changes: DocumentChangeAction<T>[]) =>
        changes.map((change: DocumentChangeAction<T>) => ({
          ...(change.payload.doc.data() as T),
          id: change.payload.doc.id,
        }))
      ),
      tap((items: T[]) => {
        logItems && console.log(`${collection.ref.path}`, items);
      })
    );
  }

  protected documentChanges<T>(
    document: AngularFirestoreDocument<T>,
    logItems = false,
    logChanges = false
  ): Observable<T> {
    return document.snapshotChanges().pipe(
      tap(() => console.log(`doc path: ${document.ref.path}`)),
      tap((change: Action<DocumentSnapshot<T>>) => {
        logChanges &&
          console.log(`${document.ref.path} ${change.type}`);
      }),
      map((change: Action<DocumentSnapshot<T>>) => ({
        ...(change.payload.data() as T),
        id: change.payload.id,
      })),
      tap((item: T) => {
        logItems && console.log(`${document.ref.path}`, item);
      })
    );
  }

  protected addToCollection<T>(
    collection: AngularFirestoreCollection<T>,
    payload: T
  ): Observable<string> {
    payload = { created: Date.now(), ...payload };
    return from(collection.add(payload)).pipe(map((created) => created.id));
  }
}
