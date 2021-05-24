import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import { Socket, SocketIoConfig } from "ngx-socket-io";
import { v4 as uuidv4 }  from 'uuid';

declare const Peer;

interface VideoElement {
  muted: boolean;
  srcObject: MediaStream;
  userId: string;
}

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit {
  currentUserId:string = uuidv4();
  videos: VideoElement[] = [];

  private socket;
  constructor(
    private route: ActivatedRoute,
   
    
  ) {
    
  }

  ngOnInit() {    
    console.log(`Initialize Peer with id ${this.currentUserId}`);
    // const myPeer = new Peer(this.currentUserId, {
    // host: '/test-app-peer.herokuapp.com',
    //   port: 80,
    //   secure: false,       
    // });
    // const myPeer = new Peer(this.currentUserId, {
    //   host: '/',
    //   port: 3001,
    // });

    const myPeer = new Peer(this.currentUserId, { url: 'https://9000-magenta-dinosaur-xc650j6e.ws-eu07.gitpod.io' });
    const config: SocketIoConfig = { url: '/', options: {} };
    this.socket = new Socket(config)

    this.route.params.subscribe((params) => {
      console.log(params);
      console.log(`Suscription to Peer.open with id ${this.currentUserId}`);
      myPeer.on('open', userId => {
        console.log('Received open event - Peer (roomId, userId)', params.roomId, userId);
        
        /* get media */
         navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })
        .catch((err) => {
          console.error('[Error] Not able to retrieve user media:', err);
          return null;
        })
        .then((myStream: MediaStream | null) => {
          if (myStream) {
            this.addMyVideo(myStream);
          }
          console.log('Suscribeing to call...(myStream)', myStream);
          myPeer.on('call', (call) => {
            console.log('receiving call...', call);
            call.answer(myStream);

            call.on('stream', (otherUserVideoStream: MediaStream) => {
              console.log('receiving other stream', otherUserVideoStream);

              this.addOtherUserVideo(call.metadata.userId, otherUserVideoStream);
            });

            call.on('error', (err) => {
              console.error(err);
            })
          });

          this.socket.on('user-connected', (otherUserId) => {
            console.log('1/5 - Receiving user-connected event', `Calling ( otherUserId ) ${otherUserId}`);
            //for ${roomName} witch name ${userName}

            // Let some time for new peers to be able to answer
            setTimeout(() => {
              console.log('2/5 -  peer.call (otherUserId, myStream) ', otherUserId, myStream);
              const call = myPeer.call(otherUserId, myStream, {
                metadata: { userId: this.currentUserId },
              });
              myPeer.on('error', function (err) { console.log(err, 'Error'); });
              console.log('Suscribe *stream* other user: ', otherUserId);
              call.on('stream', (otherUserVideoStream: MediaStream) => {
                console.log('3/5 Receiving other user stream after his connection (otherUserId, otherUserVideoStream)', otherUserId, otherUserVideoStream);
                this.addOtherUserVideo(otherUserId, otherUserVideoStream);
              });
              console.log('Suscribe *close* other user (otherUserId): ', otherUserId);
              call.on('close', () => {
                console.log('Received *close* event (otherUserId): ', otherUserId);
                this.videos = this.videos.filter((video) => video.userId !== otherUserId);
              });
            }, 1000);
          });

           this.socket.emit('join-room', params.roomId, userId);
           console.log('Emmited join-room event (roomId, userId)', params.roomId, userId);

        });



         
        
       
      });
    });
    
     
    
    this.socket.on('user-disconnected', (myUserId) => {
      console.log(`receiving user-disconnected event from (myUserId): ${myUserId}`)
      this.videos = this.videos.filter(video => video.userId !== myUserId);
    });
  }

  addMyVideo(stream: MediaStream) {
    this.videos.push({
      muted: true,
      srcObject: stream,
      userId: this.currentUserId,
    });
  }

  addOtherUserVideo(otherUserId: string, otherUserVideoStream: MediaStream) {
    console.log('4/5 - Adding other user (userId, otherUserVideoStream): ', otherUserId, otherUserVideoStream )
    const alreadyExisting = this.videos.some(video => video.userId === otherUserId);
    if (alreadyExisting) {
      console.log('This video already existing (videos, otherUserVideoStream): ', this.videos, otherUserId);
      return;
    }
    this.videos.push({
      muted: false,
      srcObject: otherUserVideoStream,
      userId: otherUserId,
    });
    console.log('5/5 - Video added (otherUserId, otherUserVideoStream): ',  otherUserId, otherUserVideoStream);
  }

  onLoadedMetadata(event: Event) {   
    (event.target as HTMLVideoElement).play();
  }

}
