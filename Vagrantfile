require "json"
file = File.read "vagrant-config.json"
vagrantConfig = JSON.parse(file)

ip = vagrantConfig["ip"]
memory = vagrantConfig["memory"]
url = vagrantConfig["devUrl"]
hostname = vagrantConfig["hostname"]
dir = Dir.getwd

if !ip
	puts "You need to specify an IP in vagrant-config.json"
	abort
end

if !url
	puts "You need to specify a local url (devUrl) in vagrant-config.json"
	abort
end

if !memory
  memory = "2048"
end

if !hostname
  hostname = "protobox"
end

Vagrant.configure("2") do |config|
  config.vm.box = "generic/ubuntu1804"
  config.vm.box_version = "1.9.20"
	config.vm.network "private_network", ip: ip
	config.vm.define "protobox"
	config.vm.synced_folder dir, "/home/vagrant/app"
  config.vm.hostname = hostname
  config.vm.provision "shell", inline: "/bin/sh /home/vagrant/app/bin/vagrant-network-fix.sh", run: "always"
  config.vm.provision "shell", inline: "/bin/sh /home/vagrant/app/bin/provision-vagrant.sh " + url + " " + ip
  config.vm.provision "shell", inline: "sudo /bin/sh -c 'echo 127.0.0.1 " + url + " >> /etc/hosts'"
  config.vm.provider "virtualbox" do |vb|
    vb.memory = "2048"
  end
end
