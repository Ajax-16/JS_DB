pipeline {
    agent any
    tools {
        nodejs "npm"
    }
    environment {
        GITHUB_TOKEN = credentials('github_key')
    }
    stages {
        stage("Clone Git repository") {
            steps {
                sh 'git config --global user.name "Ajax-16"'
                sh 'git config --global user.email "davidbernardezluque7618@gmail.com"'
                git url: 'http://gitlab:30080/root/nuedb-core.git', branch: 'main', credentialsId: 'git_user_pass'
            }
        }
        stage("Build dependencies") {
            steps {
                sh 'npm install'  
            }
        }
        stage("Testing") {
            steps {
                sh 'npm run test'  
            }
        }
        stage("Create git version tag") {
            steps {
                withCredentials([usernamePassword(credentialsId: 'git_user_pass', usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
                    script {
                        def packageJson = readJSON file: 'package.json'
                        def tagName = packageJson.version
                        def tagMessage = "Version ${tagName}"
                        sh "git tag -a ${tagName} -m \"${tagMessage}\""
                        sh "git push --tags http://${USERNAME}:${PASSWORD}@gitlab:30080/root/nuedb-core.git"
                    }
                }
            }
        }
        stage("Push to Github") {
            steps {
                sh 'git config --global user.name "Ajax-16"'
                sh 'git config --global user.email "davidbernardezluque7618@gmail.com"'
                
                sh 'git remote add github https://$GITHUB_TOKEN@github.com/Ajax-16/nuedb-core.git'
                        
                sh 'git push github'
                
                // Para que en el siguiente job no exista
                sh 'git remote rm github'
                    
            }
        }
        stage("publish to npm") {
            steps {
                withCredentials([string(credentialsId: 'NPM_TOKEN', variable: 'TOKEN')]) {
                    sh 'echo "//registry.npmjs.org/:_authToken=${TOKEN}" >> ~/.npmrc'
                    sh 'npm publish'
                }
            }
        }
    }
}
