// export const content = [
//     // first light bulb scene.
//     //second pull the loght bulb and next opens up the 3d bed which shows a man  lying on it, and as u scrool it reovolves around the person to show his thoughts, which have formed above, the particles from his head are going and forming up, and this is all seen in the 3rd person pov/
//     "I am trying to sleep but I cannot stop waking up.",
//     // next scene is that the thought takes a shape of hand (handfull.glb) 
//     "I look at my hand. I have looked at it ten thousand times. It has a shape. It has lines.",
//     // and as one scrolls, the hand full fades to show the underlying hand_skeleton.glb, (which was present from the very starting) 
//     " But today, it is not a hand. It is a thing. It is meat wrapped around bone, moving by itself. I command it to move. It moves.",
//     " But who commanded it? I hear a voice in my head saying, \"I moved it.\" But I heard that voice. So who is the one listening to the voice?",
//     "I am peeling an onion, looking for the center, but the onion has no center. It is just peel. I am peeling myself. I take off the job. I take off the name. I take off the history. \"I am a good person.\" No. That is a thought. \"I am scared.\" No. That is a chemical. \"I exist.\" Do I?",
//     "I walked down the street today. I saw faces. Hundreds of them. They looked like masks. I saw my friend. He was laughing. I saw the fear behind the laugh. I saw the desperate need to be seen. I saw the machinery. I wanted to scream at him. I wanted to shake him and say, \"Stop pretending! There is no one inside you!\" But I didn't. I smiled. I played the game. The lie tasted like ash in my mouth.",
//     "I want to go back. Please, let me go back. I want to care about the deadline. I want to care about the argument. I want to believe that if I get the money, or the girl, or the praise, the hole will close. But I know the hole isn't in me. I am the hole.",
//     "It is so loud. The silence is so loud. It is a humming. It is a vibration. It is the sound of the world existing without anyone to witness it. I am fading. I am speaking, but the words are coming from nowhere. I am typing this, but there are no fingers. There is just the typing. There is just the seeing.",
//     "There is a panic rising. It is not my panic. It is just panic. Floating in the room like smoke. I try to find the \"I\" to protect. I look for him. I look behind the eyes. Empty. I look behind the thoughts. Empty. I look behind the fear. Empty.",
//     "There is no one driving this car. The steering wheel is turning. The gas pedal is pressed. The scenery is moving. But the seat is empty.",
//     "So who is asking this? If there is no me, who is terrified? If there is no me, who is reading this sentence right now? Who is looking out of your eyes? Don't say \"me.\" Look closer. Look until it burns. Who is looking?",
//     "Who?"
// ];


export const content = [
    // The camera revolves around the sleeper. Particles form thoughts.
    "I am trying to sleep but I cannot stop waking up.",
    " \n ", // Breath to let the 3D scene revolve

    // --- SCENE 2: THE HAND (Flesh) ---
    // Transition to handfull.glb. Inspecting the surface.
    "I look at my hand.",
    "I have looked at it ten thousand times.",
    "It has a shape. It has lines.",
    "  \n ", // Breath before the reveal

    // --- SCENE 3: THE SKELETON (X-Ray) ---
    // Transition: handfull.glb fades to hand_skeleton.glb.
    // The text hits exactly when the bone is revealed.
    "But today, it is not a hand. It is a thing.",
    "It is meat wrapped around bone, moving by itself.", 
    "I command it to move. It moves.",
    "  \n ", // Pause for realization

    // --- SCENE 4: THE OBSERVER (Particles) ---
    // The skeleton dissolves or particles swirl. 
    "But who commanded it?",
    "I hear a voice in my head saying, 'I moved it.'",
    "But I heard that voice.",
    "So who is the one listening to the voice?",

    // --- SCENE 5: THE ONION (Deconstruction) ---
    // Fast-paced cuts. Visuals should be erratic or stripping away layers.
    "I am peeling an onion, looking for the center.",
    "But the onion has no center. It is just peel.",
    "I am peeling myself.", 
    "  \n ",
    "I take off the job. I take off the name.",
    "I take off the history.",
    "'I am a good person.' No. That is a thought.",
    "'I am scared.' No. That is a chemical.",
    "'I exist.' Do I?",

    // --- SCENE 6: THE STREET (The Masks) ---
    // Visual shift: Abstract faces or wireframe crowds.
    "I walked down the street today.",
    "I saw faces. Hundreds of them. They looked like masks.",
    "I saw my friend. He was laughing.",
    "I saw the fear behind the laugh. I saw the machinery.",
    "  \n ", // Dramatic pause
    "I wanted to scream at him.",
    "I wanted to shake him and say, 'Stop pretending! There is no one inside you!'",
    "But I didn't.",
    "I smiled. I played the game.",
    "The lie tasted like ash in my mouth.",

    // --- SCENE 7: THE HOLE (Desire) ---
    // Visuals: A dark void or pulling away from the subject.
    "I want to go back. Please, let me go back.",
    "I want to care about the deadline. I want to care about the argument.",
    "I want to believe that if I get the money, or the girl, or the praise, the hole will close.",
    "  \n   ",
    "But I know the hole isn't in me.",
    "I am the hole.",

    // --- SCENE 8: THE DISSOLUTION (Fading) ---
    // Visuals: The 3D world starts to glitch or fade to white/black.
    "It is so loud. The silence is so loud.",
    "It is a humming. It is a vibration.",
    "It is the sound of the world existing without anyone to witness it.",
    "I am fading.",
    "I am speaking, but the words are coming from nowhere.",
    "I am typing this, but there are no fingers.",
    "There is just the typing. There is just the seeing.",

    // --- SCENE 9: THE PANIC (Empty Room) ---
    "There is a panic rising.",
    "It is not my panic. It is just panic.",
    "Floating in the room like smoke.",
    "I try to find the 'I' to protect.",
    "I look for him. I look behind the eyes. Empty.",
    "I look behind the thoughts. Empty.",
    "I look behind the fear. Empty.",

    // --- SCENE 10: THE CAR (Autopilot) ---
    // Visuals: Constant motion, but no actor.
    "There is no one driving this car.",
    "The steering wheel is turning. The gas pedal is pressed.",
    "The scenery is moving.",
    "But the seat is empty.",

    // --- SCENE 11: THE CONFRONTATION (Breaking the Fourth Wall) ---
    // Visuals: The camera turns to look "out" of the screen at the user.
    "So who is asking this?",
    "If there is no me, who is terrified?",
    "If there is no me, who is reading this sentence right now?",
    "    \n   ",
    "Who is looking out of your eyes?",
    "Don't say 'me.' Look closer.",
    "Look until it burns.",
    "Who is looking?",
    "  \n   ",
    "Who?"
];