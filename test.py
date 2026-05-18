# Create a massive list that grows until it eats 256MB of RAM
memory_eater = []
while True:
    memory_eater.append(' ' * 10**6)
