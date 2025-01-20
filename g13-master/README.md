# SDLE Second Assignment

# Distributed Shopping List Application

A local-first shopping list application with cloud synchronization capabilities, built using Node.js and ZeroMQ for distributed communication.

SDLE Second Assignment of group T01G13.

Group members:

1. Gonçalo Matias (up202108703@up.pt)
2. Igor Andrade (up202108674@up.pt)
3. João Fernandes (up202108044@up.pt)
4. João Sequeira (up202108823@up.pt)

## Prerequisites

- Node.js v18.x
- npm (Node Package Manager)
- Python 3.x (for sqlite3 build)
- C++ build tools (for node-gyp)

## Important: Database Setup

Before running any component, you must:

1. Create the database directory if it doesn't exist:
```bash
mkdir -p database
```

2. Initialize the database:
```bash
node dbSetup.js
```

This setup is required only once, but the database directory must exist for the application to work.

## Installation

1. Clone the repository:
```bash
git clone git@git.fe.up.pt:sdle/2024/t1/g13.git
cd g13
```

2. Install dependencies:
```bash
npm install
```

3. Install specific package versions for compatibility:
```bash
npm install sqlite3@5.1.6 --build-from-source
npm install chalk@4.1.2 inquirer@8.2.4
```

### Common Installation Issues

#### macOS Specific Issues

1. If you encounter node-gyp or NAPI errors:
```bash
# Install Xcode Command Line Tools
xcode-select --install

# If using M1/M2 Mac, you might need to set Python path
export PYTHON=/usr/bin/python3

# Rebuild sqlite3
npm rebuild sqlite3 --build-from-source
```

2. If you see "Failed to load glibc":
```bash
# Install rosetta for M1/M2 Macs
softwareupdate --install-rosetta
```

#### General Issues

1. If sqlite3 fails to build:
```bash
# Install build essentials (Linux)
sudo apt-get install build-essential python3

# Or on macOS
brew install python
```

2. Node-gyp errors:
```bash
# Clear npm cache and node_modules
rm -rf node_modules
npm cache clean --force
npm install
```

## Running the Application

The application consists of three components that need to be started in the following order:

1. Start the Cloud Service (First Terminal):
```bash
./run_cloud.sh
# or
node src/message_system/cloud.js
```

2. Start the Proxy Service (Second Terminal):
```bash
./run_proxy.sh
# or
node src/message_system/proxy.js
```

3. Start the Client Interface (Third Terminal):
```bash
./run_client.sh
# or
node src/interface.js
```

## Component Description

- **Cloud Service**: Handles data persistence and synchronization between clients
- **Proxy Service**: Manages message routing and communication between components
- **Client Interface**: Provides user interface for managing shopping lists

## Using the Application

After starting all components, you can:
1. Enter your username (your database will have your name in it)
2. Create new shopping lists
3. Modify existing lists (add/remove items)
4. Delete lists
5. Sync with the cloud service
6. View all your lists

## Troubleshooting

If you encounter any issues:

1. Ensure the database is properly initialized:
   - Check if the `database` directory exists
   - Run `node dbSetup.js` again if necessary
   - Verify database file permissions

2. Component startup issues:
   - Ensure all components are started in the correct order
   - Check that all required ports are available
   - Verify your Node.js version is compatible
   - Make sure sqlite3 is properly installed

3. Database errors:
   - If you see "SQLITE_CANTOPEN" errors, check file permissions
   - For "database is locked" errors, ensure no other process is using the database
   - Try deleting the database file and running dbSetup.js again

## Development

- The application uses ZeroMQ for message passing
- SQLite3 for local data storage
- Implements a distributed architecture based on Amazon Dynamo paper

## Technical Details

### Architecture
- **ZeroMQ Patterns**:
  - PUB/SUB for broadcasting updates
  - REQ/REP for direct node communication
  - Proxy pattern for message routing

### Database Structure
- **Shopping Lists Table**:
  - owner (TEXT)
  - url (TEXT, PRIMARY KEY)
  - created_at (DATETIME)
  - updated_at (DATETIME)
  - acquired (BOOLEAN)

- **Items Table**:
  - id (INTEGER PRIMARY KEY)
  - list_id (TEXT, FOREIGN KEY)
  - description (TEXT)
  - quantity (INTEGER)
  - acquired (BOOLEAN)
  - created_at (DATETIME)

## Acknowledgments
Based on architectural concepts from:
- Amazon Dynamo paper
- Local-first software principles