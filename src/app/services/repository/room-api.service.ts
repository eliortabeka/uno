import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseFirestoreService } from './base-firestore.service';
import { IUser, Room, toUserInfo } from '@models/index';

@Injectable({ providedIn: 'root' })
export class RoomApiService extends BaseFirestoreService {
  constructor(private firestore: AngularFirestore) {
    super();
  }

  public async exists(roomId: string): Promise<boolean> {
    const ref = this.firestore.doc<Room>(`rooms/${roomId}`).ref;
    const doc = await ref.get();
    return doc.exists;
  }

  public async getById(roomId: string): Promise<Room> {
    const ref = this.firestore.doc<Room>(`rooms/${roomId}`).ref;
    const doc = await ref.get();
    return doc.data();
  }

  public onRoomChange(roomId: string): Observable<Room> {
    return this.documentChanges(this.firestore.doc<Room>(`rooms/${roomId}`));
  }

  public createRoom(creator: IUser, data?: Partial<Room>): Promise<string> {
    return this.addToCollection(this.firestore.collection(`rooms`), {
      ...data,
      creator: creator.id,
      members: [creator.id],
      users: [toUserInfo(creator)],
    });
  }

  public update(room: Room): Promise<void> {
    return this.firestore
      .doc(`rooms/${room.id}`)
      .update({ ...room, updated: Date.now() });
  }

  public remove(roomId: string): Promise<void> {
    return this.firestore.doc(`rooms/${roomId}`).delete();
  }

  public async joinRoom(roomId: string, user: IUser): Promise<void> {
    const roomDoc = this.firestore.doc<Room>(`rooms/${roomId}`);
    const snapshot = await roomDoc.ref.get();

    if (!snapshot.exists) return;

    const room: Room = snapshot.data();
    if (room.members.indexOf(user.id) < 0) {
      room.members.push(user.id);
      room.users.push(toUserInfo(user));
      await roomDoc.update(room);
    }
  }

  public async leaveRoom(roomId: string, userId: string): Promise<void> {
    const roomDoc = this.firestore.doc<Room>(`rooms/${roomId}`);
    const snapshot = await roomDoc.ref.get();

    if (!snapshot.exists) return;

    const room: Room = snapshot.data();
    const userIndex = room.users.findIndex((u) => u.id == userId);
    const memberIndex = room.members.indexOf(userId);

    if (memberIndex >= 0) {
      room.users.splice(userIndex, 1);
      room.members.splice(memberIndex, 1);
      await roomDoc.update(room);
    }
  }

  public roomUsers(roomId: string): Observable<IUser[]> {
    return this.firestore
      .doc<Room>(`rooms/${roomId}`)
      .valueChanges()
      .pipe(map((room) => room.users));
  }

  public roomOtherUsers(roomId: string, userId: string): Observable<any[]> {
    return this.roomUsers(roomId).pipe(
      map((users) => users.filter((user) => user.id != userId))
    );
  }

  public userRooms(userId: string): Observable<Room[]> {
    return this.collectionChanges(
      this.firestore.collection<Room>(`rooms`, (ref) =>
        ref
          .where('members', 'array-contains', userId)
          .orderBy('created', 'desc')
      )
    );
  }
}
