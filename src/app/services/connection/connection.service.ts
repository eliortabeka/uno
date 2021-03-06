import { Injectable } from '@angular/core';
import { of } from 'rxjs';

import { offerOptions } from '@constants/index';
import { User, Offer, Answer, Connection, IUser } from '@models/index';
import { IceCandidateService } from './ice-candidate.service';
import { ApiService } from '@services/repository/api.service';

@Injectable({ providedIn: 'root' })
export class ConnectionService {
  public user: User;
  public roomId: string;

  constructor(
    private api: ApiService,
    private iceCandidateService: IceCandidateService
  ) {}

  public init(user: User, roomId: string) {
    this.user = user;
    this.roomId = roomId;
    this.iceCandidateService.roomId = roomId;
  }

  public offerAll(callerId: string, users: IUser[]) {
    for (const user of users) {
      this.offer(callerId, user.id, user.name).then();
    }
  }

  public answerAll(offers: Offer[], users: IUser[]) {
    for (const offer of offers) {
      const user = users.find((user) => user.id == offer.sender);
      const name = user ? user.name : offer.sender;
      this.answer(this.user.id, offer, name).then();
    }
  }

  public setRemoteAll(answers: Answer[], users: IUser[]) {
    for (const answer of answers) {
      const user = users.find((user) => user.id == answer.sender);
      const caller = user ? user.name : answer.sender;
      this.setRemote(answer, caller).then();
    }
  }

  public async offer(caller: string, reciever: string, name?: string) {
    const connection = this.user.getConnection(reciever, name);
    const peer = connection.peer;

    if (connection.isConnected) {
      // Dont create offer to connected peer
      return;
    }

    connection.showState('offer');

    this.user.addTracks(peer);

    peer.onicegatheringstatechange = () => {
      connection.showState('offer: onicegatheringstatechange');
      this.iceCandidateService.sendIceCandidatesByGatheringState(
        connection,
        caller,
        reciever
      );
    };

    await peer.setLocalDescription(await peer.createOffer(offerOptions));

    connection.showState('offer: setLocalDescription');

    this.sendOffer('offer', caller, reciever, peer);
  }

  public async answer(caller: string, offer: Offer, name?: string) {
    const reciever = offer.sender;
    const connection = this.user.getConnection(reciever, name);
    const peer = connection.peer;

    if (connection.isConnected) {
      // Dont create answer to connected peer
      return;
    }

    connection.showState('answer');

    this.user.addTracks(peer);

    peer.onicegatheringstatechange = () => {
      connection.showState('answer: onicegatheringstatechange');
      this.iceCandidateService.sendIceCandidatesIfCompleted(
        connection,
        caller,
        reciever
      );
    };

    await this.trySetRemote(connection, offer);

    const retryCount = 3;
    this.tryCreateAnswer(connection, retryCount, () => {
      this.iceCandidateService
        .addIceCandidatesIfExists(this.user)
        .subscribe(() => this.sendOffer('answer', caller, reciever, peer));
    });
  }

  public async setRemote(answer: Answer, name?: string) {
    const connection = this.user.getConnection(answer.sender, name);
    const peer = connection.peer;

    if (connection.isConnected) {
      // Dont setRemote to connected peer
      return;
    }

    connection.showState('setRemote');

    this.trySetRemoteWithRetry(connection, answer, 3);

    // try {
    //   await peer.setRemoteDescription(answer.description);
    //   connection.showState('setRemote: setRemoteDescription');
    // } catch (error) {
    //   console.log(error);
    // }
  }

  private sendOffer(
    type: 'offer' | 'answer',
    caller: string,
    reciever: string,
    peer: RTCPeerConnection
  ) {
    this.api.offer
      .createOffer(this.roomId, {
        type,
        sender: caller,
        receiver: reciever,
        description: peer.localDescription.toJSON(),
      })
      .catch(this.handleError);
  }

  private async trySetRemote(connection: Connection, offer: Offer) {
    try {
      const peer = connection.peer;
      if (peer.signalingState != 'stable') {
        console.log('rollback');
        await Promise.all([
          peer.setLocalDescription({ type: 'rollback' }),
          peer.setRemoteDescription(offer.description),
        ]);
      } else {
        await peer.setRemoteDescription(offer.description);
      }
      await peer.setRemoteDescription(offer.description);
      connection.showState('answer: setRemoteDescription');
    } catch (error) {
      console.log(error);
    }
  }

  private tryCreateAnswer(
    connection: Connection,
    retry: number,
    callBack: Function
  ) {
    if (retry <= 0) {
      return;
    }

    const peer = connection.peer;
    let successful = false;

    setTimeout(async () => {
      try {
        await peer.setLocalDescription(await peer.createAnswer(offerOptions));
        connection.showState('answer: createAnswer, setLocalDescription');

        callBack();
        successful = true;
      } catch (error) {
        console.log(error);
      }

      if (!successful) {
        this.tryCreateAnswer(connection, --retry, callBack);
      }
    }, 100);
  }

  private trySetRemoteWithRetry(
    connection: Connection,
    answer: Answer,
    retry: number
  ) {
    if (retry <= 0) {
      return;
    }

    const peer = connection.peer;
    let successful = false;

    setTimeout(async () => {
      try {
        await peer.setRemoteDescription(answer.description);
        connection.showState('setRemote: setRemoteDescription');

        successful = true;
      } catch (error) {
        console.log(error);
      }

      if (!successful) {
        this.trySetRemoteWithRetry(connection, answer, --retry);
      }
    }, 100);
  }

  private handleError(error) {
    console.log(error);
    return of(null);
  }
}
